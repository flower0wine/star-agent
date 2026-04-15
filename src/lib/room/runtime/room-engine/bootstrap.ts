import { observedStreamText } from "@/lib/observability/ai-sdk";
import { stepCountIs } from "ai";
import { createTextSharedMessage } from "../../message-share-filter";
import type { RoomStreamEvent } from "./events";
import type { RoomEngineRuntimeContext } from "./context";
import { appendDeltaPart, resolveStreamChunkDelta } from "./stream";
import { buildPlaywrightBootstrapPrompt } from "./shared";
import { createPlaywrightControlTools } from "./tools";

export async function* runBootstrapPhase(
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

  yield {
    type: "start",
    phase: "playwright",
    actorType: "playwright",
    actorId: roomConfig.playwright.id,
    actorName: roomConfig.playwright.name,
    turnNo,
  };

  const controlTools = createPlaywrightControlTools({
    roomConfig,
    turnState,
    requestId,
    roomId: input.roomId,
  });

  const bootstrapStream = observedStreamText({
    model: modelInstance.model,
    system: roomConfig.playwright.systemPromptTemplate,
    prompt: buildPlaywrightBootstrapPrompt(roomConfig, conversationText),
    tools: controlTools.tools,
    stopWhen: stepCountIs(12),
    providerOptions: modelInstance.supportsReasoning
      ? { reasoningSummary: "detailed" as const } as any
      : undefined,
  }, {
    functionId: "room.playwright.bootstrap",
    requestId,
    agentId: "playwright",
    sessionId: roomSessionId,
    metadata: {
      roomId: input.roomId,
      cycleNo: turnState.cycleNo,
    },
  });

  const visibleParts: Array<{ type: "text"; text: string }> = [];
  const renderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];
  const cursor = { text: "", reasoning: "" };

  for await (const chunk of bootstrapStream.fullStream) {
    const typedChunk = chunk as { type?: string; delta?: string; text?: string };
    if (!typedChunk?.type) {
      continue;
    }

    if (typedChunk.type === "text-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "text", cursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(renderParts, "text", chunkText);
      const lastVisible = visibleParts.at(-1);
      if (lastVisible) {
        lastVisible.text += chunkText;
      } else {
        visibleParts.push({ type: "text", text: chunkText });
      }

      yield {
        type: "delta",
        partType: "text",
        text: chunkText,
      };
      continue;
    }

    if (typedChunk.type === "reasoning-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", cursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(renderParts, "reasoning", chunkText);
      yield {
        type: "delta",
        partType: "reasoning",
        text: chunkText,
      };
    }
  }

  const nextConfig = controlTools.getNextRoomConfig();
  const bootstrapText = visibleParts.map(part => part.text).join("").trim()
    || nextConfig.world.playwrightOutput.trim()
    || "编剧初始化完成。";

  const message = createTextSharedMessage({
    id: `room-msg-${crypto.randomUUID()}`,
    roomId: input.roomId,
    turnNo,
    actorType: "playwright",
    actorId: roomConfig.playwright.id,
    actorName: roomConfig.playwright.name,
    text: bootstrapText,
    createdAt: nowIso,
    metadata: {
      messageKind: "playwright-bootstrap",
    },
  });

  if (visibleParts.length > 0) {
    message.visibleParts = visibleParts
      .map(part => ({ ...part, text: part.text.trim() }))
      .filter(part => part.text.length > 0);
  }

  if (renderParts.length > 0) {
    message.renderParts = renderParts
      .map(part => ({ ...part, text: part.text.trim() }))
      .filter(part => part.text.length > 0);
  }

  const toolParts = controlTools.getToolRenderParts();
  if (toolParts.length > 0) {
    message.renderParts = [
      ...(message.renderParts || []),
      ...toolParts,
    ];
  }

  const nextTurnState = controlTools.getNextTurnState();
  const hasEnabledCharacters = nextConfig.characters.some(character => character.enabled);

  yield {
    type: "done",
    payload: {
      phase: "playwright",
      message,
      roomConfig: nextConfig,
      turnState: hasEnabledCharacters
        ? {
            ...nextTurnState,
            nextPhase: nextTurnState.nextPhase,
            cycleArmed: nextTurnState.cycleArmed,
            updatedAt: Date.now(),
          }
        : {
            ...nextTurnState,
            nextPhase: "playwright",
            cycleArmed: false,
            updatedAt: Date.now(),
          },
    },
  };
}
