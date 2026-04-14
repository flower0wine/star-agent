import { observedStreamText } from "@/lib/observability/ai-sdk";
import { createTextSharedMessage } from "../../message-share-filter";
import { resolveNextSpeaker } from "../../turn-policy";
import type { RoomStreamEvent } from "./events";
import type { RoomEngineRuntimeContext } from "./context";
import { appendDeltaPart, resolveStreamChunkDelta } from "./stream";
import {
  buildCharacterPrompt,
  buildCharacterSystemPrompt,
  formatClientBrief,
  nextCharacterTurnState,
} from "./shared";
import { createPlaywrightControlTools } from "./tools";

export async function* runCharacterPhase(
  context: RoomEngineRuntimeContext,
): AsyncGenerator<RoomStreamEvent> {
  const {
    input,
    requestId,
    roomSessionId,
    nowIso,
    turnNo,
    conversationText,
    modelInstance,
    roomConfig,
    turnState,
  } = context;

  const nextSpeaker = resolveNextSpeaker(roomConfig.characters, turnState);
  const directionPrompt = [
    "你是幕后编剧，请只为当前角色生成本轮导演指令。",
    "必要时你可以调用 createCharacter 工具创建新角色来补齐剧情结构。",
    "你的全部输出必须为简体中文。",
    "你必须遵循用户创作指令。",
    "",
    "用户创作指令：",
    formatClientBrief(roomConfig),
    "",
    `当前角色: ${nextSpeaker.name} (${nextSpeaker.id})`,
    "请输出 3-5 行短指令，包含：目标、冲突、语气、下一步动作。",
    "禁止输出 JSON，禁止解释规则，只输出可执行导演指令。",
    "",
    "当前对话：",
    conversationText || "（暂无历史）",
  ].join("\n");

  const controlTools = createPlaywrightControlTools({
    roomConfig,
    turnState,
    requestId,
    roomId: input.roomId,
  });

  yield {
    type: "start",
    phase: "playwright",
    actorType: "playwright",
    actorId: roomConfig.playwright.id,
    actorName: roomConfig.playwright.name,
    turnNo,
  };

  const directionStream = observedStreamText({
    model: modelInstance.model,
    system: roomConfig.playwright.systemPromptTemplate,
    prompt: directionPrompt,
    tools: controlTools.tools,
    providerOptions: modelInstance.supportsReasoning
      ? { reasoningSummary: "detailed" as const } as any
      : undefined,
  }, {
    functionId: "room.character.direction",
    requestId,
    agentId: "playwright",
    sessionId: roomSessionId,
    metadata: {
      roomId: input.roomId,
      cycleNo: turnState.cycleNo,
      characterId: nextSpeaker.id,
      characterName: nextSpeaker.name,
    },
  });

  const directionVisibleParts: Array<{ type: "text"; text: string }> = [];
  const directionRenderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];
  const directionCursor = { text: "", reasoning: "" };

  for await (const chunk of directionStream.fullStream) {
    const typedChunk = chunk as { type?: string; delta?: string; text?: string };
    if (!typedChunk?.type) {
      continue;
    }

    if (typedChunk.type === "text-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "text", directionCursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(directionRenderParts, "text", chunkText);
      const lastVisible = directionVisibleParts.at(-1);
      if (lastVisible) {
        lastVisible.text += chunkText;
      } else {
        directionVisibleParts.push({ type: "text", text: chunkText });
      }
      yield { type: "delta", partType: "text", text: chunkText };
      continue;
    }

    if (typedChunk.type === "reasoning-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", directionCursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(directionRenderParts, "reasoning", chunkText);
      yield { type: "delta", partType: "reasoning", text: chunkText };
    }
  }

  const playwrightDirection = directionVisibleParts.map(part => part.text).join("").trim()
    || "保持角色核心动机，推动冲突升级并给出明确行动。";

  const directionMessage = createTextSharedMessage({
    id: `room-msg-${crypto.randomUUID()}`,
    roomId: input.roomId,
    turnNo,
    actorType: "playwright",
    actorId: roomConfig.playwright.id,
    actorName: roomConfig.playwright.name,
    text: `导演提示（${nextSpeaker.name}）：\n${playwrightDirection}`,
    createdAt: nowIso,
    metadata: {
      messageKind: "playwright-direction",
    },
  });

  if (directionVisibleParts.length > 0) {
    directionMessage.visibleParts = directionVisibleParts
      .map(part => ({ ...part, text: part.text.trim() }))
      .filter(part => part.text.length > 0);
  }

  if (directionRenderParts.length > 0) {
    directionMessage.renderParts = directionRenderParts
      .map(part => ({ ...part, text: part.text.trim() }))
      .filter(part => part.text.length > 0);
  }

  const directionToolParts = controlTools.getToolRenderParts();
  if (directionToolParts.length > 0) {
    directionMessage.renderParts = [
      ...(directionMessage.renderParts || []),
      ...directionToolParts,
    ];
  }

  yield {
    type: "commit",
    message: directionMessage,
  };

  const nextConfigFromTools = controlTools.getNextRoomConfig();

  yield {
    type: "start",
    phase: "character",
    actorType: "character",
    actorId: nextSpeaker.id,
    actorName: nextSpeaker.name,
    turnNo: turnNo + 1,
  };

  const characterStream = observedStreamText({
    model: modelInstance.model,
    system: buildCharacterSystemPrompt({
      roomConfig,
      characterId: nextSpeaker.id,
      playwrightDirection,
    }),
    prompt: buildCharacterPrompt(conversationText),
    providerOptions: modelInstance.supportsReasoning
      ? { reasoningSummary: "detailed" as const } as any
      : undefined,
  }, {
    functionId: "room.character.stream",
    requestId,
    agentId: nextSpeaker.id,
    sessionId: roomSessionId,
    metadata: {
      roomId: input.roomId,
      cycleNo: turnState.cycleNo,
      characterName: nextSpeaker.name,
    },
  });

  const characterVisibleParts: Array<{ type: "text"; text: string }> = [];
  const characterRenderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];
  const characterCursor = { text: "", reasoning: "" };

  for await (const chunk of characterStream.fullStream) {
    const typedChunk = chunk as { type?: string; delta?: string; text?: string };
    if (!typedChunk?.type) {
      continue;
    }

    if (typedChunk.type === "text-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "text", characterCursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(characterRenderParts, "text", chunkText);
      const lastVisible = characterVisibleParts.at(-1);
      if (lastVisible) {
        lastVisible.text += chunkText;
      } else {
        characterVisibleParts.push({ type: "text", text: chunkText });
      }
      yield { type: "delta", partType: "text", text: chunkText };
      continue;
    }

    if (typedChunk.type === "reasoning-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", characterCursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(characterRenderParts, "reasoning", chunkText);
      yield { type: "delta", partType: "reasoning", text: chunkText };
    }
  }

  const characterText = characterVisibleParts.map(part => part.text).join("").trim();

  const message = createTextSharedMessage({
    id: `room-msg-${crypto.randomUUID()}`,
    roomId: input.roomId,
    turnNo: turnNo + 1,
    actorType: "character",
    actorId: nextSpeaker.id,
    actorName: nextSpeaker.name,
    text: characterText,
    createdAt: nowIso,
    metadata: {
      messageKind: "character-dialogue",
    },
  });

  if (characterVisibleParts.length > 0) {
    message.visibleParts = characterVisibleParts
      .map(part => ({ ...part, text: part.text.trim() }))
      .filter(part => part.text.length > 0);
  }

  if (characterRenderParts.length > 0) {
    message.renderParts = characterRenderParts
      .map(part => ({ ...part, text: part.text.trim() }))
      .filter(part => part.text.length > 0);
  }

  yield {
    type: "done",
    payload: {
      phase: "character",
      message,
      extraMessages: [directionMessage],
      roomConfig: nextConfigFromTools,
      turnState: nextCharacterTurnState(turnState, nextSpeaker.id),
    },
  };
}
