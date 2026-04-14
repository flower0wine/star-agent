import dayjs from "dayjs";
import { tool } from "ai";
import { z } from "zod";
import type { RoomConfig, RoomGenerationRequest, RoomGenerationResponse, RoomTurnState } from "../types";
import { PLAYWRIGHT_REVIEW_INTERVAL } from "../constants";
import { createTextSharedMessage, sharedMessageText } from "../message-share-filter";
import { buildPlaywrightRevisionPrompt, parsePlaywrightRevisionJSON, applyPromptRevision } from "../playwright-policy";
import { resolveNextSpeaker } from "../turn-policy";
import { buildRoomConversationText, resolveNextTurnNo } from "./room-context-builder";
import { createRoomPromptRevisionId } from "../defaults";
import { getModel } from "@/app/api/chat/model";
import { observedGenerateText, observedStreamText } from "@/lib/observability/ai-sdk";

function formatClientBrief(config: RoomConfig): string {
  return config.userDirective.trim() || "（用户尚未补充长期创作指令）";
}

function getLastTurnNoByActorType(
  messages: RoomGenerationRequest["sharedMessages"],
  actorType: "user" | "playwright",
): number {
  const turnNos = messages
    .filter(message => message.actorType === actorType)
    .map(message => message.turnNo);

  if (turnNos.length === 0) {
    return 0;
  }

  return Math.max(...turnNos);
}

function getLastPlaywrightReplyTurnNo(messages: RoomGenerationRequest["sharedMessages"]): number {
  const turnNos = messages
    .filter((message) =>
      message.actorType === "playwright"
      && message.metadata?.messageKind !== "playwright-direction",
    )
    .map(message => message.turnNo);

  if (turnNos.length === 0) {
    return 0;
  }

  return Math.max(...turnNos);
}

function hasPendingClientFeedback(messages: RoomGenerationRequest["sharedMessages"]): boolean {
  const lastUserTurn = getLastTurnNoByActorType(messages, "user");
  const lastPlaywrightReplyTurn = getLastPlaywrightReplyTurnNo(messages);
  return lastUserTurn > lastPlaywrightReplyTurn;
}

function collectPendingClientFeedback(messages: RoomGenerationRequest["sharedMessages"]): string {
  const lastPlaywrightTurn = getLastPlaywrightReplyTurnNo(messages);
  const feedbackMessages = messages
    .filter(message => message.actorType === "user" && message.turnNo > lastPlaywrightTurn)
    .toSorted((a, b) => a.turnNo - b.turnNo)
    .map(message => `- ${sharedMessageText(message)}`);

  if (feedbackMessages.length === 0) {
    return "（无新增用户反馈）";
  }

  return feedbackMessages.join("\n");
}

function buildCharacterSystemPrompt(input: {
  roomConfig: RoomConfig;
  characterId: string;
  playwrightDirection: string;
}): string {
  const character = input.roomConfig.characters.find(item => item.id === input.characterId);
  if (!character) {
    throw new Error(`角色不存在: ${input.characterId}`);
  }

  return [
    `你将扮演角色: ${character.name}。`,
    "以下是用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    input.roomConfig.world.worldPromptTemplate,
    character.systemPromptTemplate,
    `编剧本轮导演指令：\n${input.playwrightDirection}`,
    "你只能以该角色身份输出一段推进剧情的对话，不要解释系统规则。",
  ].join("\n\n");
}

function buildCharacterPrompt(conversationText: string): string {
  return [
    "以下是交流室对话历史：",
    conversationText || "（暂无历史）",
    "",
    "请继续剧情，输出一段角色对话。",
  ].join("\n");
}

const MAX_ROOM_CHARACTERS = 10;
const ROOM_CHARACTER_NAME_MAX_LENGTH = 24;

const createCharacterToolInputSchema = z.object({
  name: z.string().trim().min(2).max(ROOM_CHARACTER_NAME_MAX_LENGTH),
  personalityTraits: z.array(z.string().trim().min(1).max(36)).min(2).max(6),
  coreValues: z.array(z.string().trim().min(1).max(36)).min(2).max(5),
  speakingStyle: z.string().trim().min(6).max(120),
  motivation: z.string().trim().min(6).max(180),
  worldview: z.string().trim().min(6).max(180),
  conflictLine: z.string().trim().min(6).max(120),
});

interface CreateCharacterToolResult {
  status: "created" | "rejected";
  message: string;
  characterId?: string;
  characterName?: string;
}

function normalizeCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function buildCharacterPromptTemplate(input: z.infer<typeof createCharacterToolInputSchema>): string {
  return [
    `你是角色 ${input.name}。`,
    `核心性格：${input.personalityTraits.join("、")}。`,
    `价值观底层：${input.coreValues.join("、")}。`,
    `表达风格：${input.speakingStyle}。`,
    `核心动机：${input.motivation}。`,
    `世界观立场：${input.worldview}。`,
    `冲突底线：${input.conflictLine}。`,
    "始终保持角色一致性，避免脱离设定或复述系统规则。",
  ].join("\n");
}

function createPlaywrightCharacterTools(input: {
  roomConfig: RoomConfig;
  requestId: string;
  roomId: string;
}) {
  let nextRoomConfig = input.roomConfig;

  return {
    tools: {
      createCharacter: tool({
        description: [
          "创建一个新角色并加入交流室。",
          "必须填写模板字段：name、personalityTraits、coreValues、speakingStyle、motivation、worldview、conflictLine。",
          `角色上限为 ${MAX_ROOM_CHARACTERS}，名称不可重复。`,
        ].join(" "),
        inputSchema: createCharacterToolInputSchema,
        execute: async (rawInput): Promise<CreateCharacterToolResult> => {
          const parsed = createCharacterToolInputSchema.parse(rawInput);
          const name = normalizeCharacterName(parsed.name);

          if (nextRoomConfig.characters.length >= MAX_ROOM_CHARACTERS) {
            return {
              status: "rejected",
              message: `当前角色已达上限 ${MAX_ROOM_CHARACTERS}，请先复用或精简现有角色。`,
            };
          }

          const duplicated = nextRoomConfig.characters.some((character) =>
            character.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
          );
          if (duplicated) {
            return {
              status: "rejected",
              message: `角色名“${name}”已存在，请更换名称。`,
            };
          }

          const highestOrder = nextRoomConfig.characters.length === 0
            ? 0
            : Math.max(...nextRoomConfig.characters.map(character => character.order));
          const characterId = `character-${crypto.randomUUID().slice(0, 8)}`;

          nextRoomConfig = {
            ...nextRoomConfig,
            characters: [
              ...nextRoomConfig.characters,
              {
                id: characterId,
                name,
                enabled: true,
                order: highestOrder + 1,
                systemPromptTemplate: buildCharacterPromptTemplate({
                  ...parsed,
                  name,
                }),
              },
            ],
            updatedAt: Date.now(),
          };

          console.log(`[${input.requestId}] playwright created character`, {
            roomId: input.roomId,
            characterId,
            name,
          });

          return {
            status: "created",
            message: `角色 ${name} 已加入并启用。`,
            characterId,
            characterName: name,
          };
        },
      }),
    },
    getNextRoomConfig: () => nextRoomConfig,
  };
}

function extractJSONObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function appendDeltaPart(
  parts: Array<{ type: "text" | "reasoning"; text: string }>,
  partType: "text" | "reasoning",
  text: string,
) {
  if (!text) {
    return;
  }

  const lastPart = parts.at(-1);
  if (lastPart?.type === partType) {
    lastPart.text += text;
    return;
  }

  parts.push({
    type: partType,
    text,
  });
}

interface StreamPartCursor {
  text: string;
  reasoning: string;
}

function resolveStreamChunkDelta(
  chunk: { delta?: string; text?: string },
  partType: "text" | "reasoning",
  cursor: StreamPartCursor,
): string {
  if (typeof chunk.delta === "string" && chunk.delta.length > 0) {
    return chunk.delta;
  }

  if (typeof chunk.text !== "string" || chunk.text.length === 0) {
    return "";
  }

  const previous = partType === "text" ? cursor.text : cursor.reasoning;
  const current = chunk.text;
  let nextDelta = current;

  if (previous.length > 0 && current.startsWith(previous)) {
    nextDelta = current.slice(previous.length);
  } else if (current === previous) {
    nextDelta = "";
  }

  if (partType === "text") {
    cursor.text = current;
  } else {
    cursor.reasoning = current;
  }

  return nextDelta;
}

function buildPlaywrightReplyPrompt(input: {
  roomConfig: RoomConfig;
  conversationText: string;
  clientFeedback: string;
}): string {
  return [
    "你是编剧，正在直接回复用户。",
    "要求：",
    "1) 复述你理解到的需求变化。",
    "2) 说明你将如何调整世界观、剧情推进与角色弧线。",
    "3) 语气专业且可执行，禁止空泛表达。",
    "",
    "用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    "用户最新反馈：",
    input.clientFeedback,
    "",
    "当前对话：",
    input.conversationText || "（暂无历史）",
  ].join("\n");
}

function buildPlaywrightFeedbackRevisionPrompt(input: {
  roomConfig: RoomConfig;
  conversationText: string;
  clientFeedback: string;
}): string {
  const characterList = input.roomConfig.characters
    .filter(character => character.enabled)
    .toSorted((a, b) => a.order - b.order)
    .map(character => `- ${character.id}: ${character.name}`)
    .join("\n");

  return [
    "你是故事总编剧，请基于用户最新反馈重写提示词配置。",
    "输出必须是 JSON，禁止额外文字。",
    "字段要求：worldPromptTemplate, playwrightOutput, characterPromptPatches, rationale。",
    "characterPromptPatches 必须覆盖所有启用角色。",
    "",
    "用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    "用户最新反馈：",
    input.clientFeedback,
    "",
    "启用角色列表：",
    characterList,
    "",
    "当前对话：",
    input.conversationText || "（暂无历史）",
  ].join("\n");
}

function nextCharacterTurnState(current: RoomTurnState, speakerId: string): RoomTurnState {
  const total = current.totalCharacterTurnsInCycle + 1;
  const nextPhase = total >= PLAYWRIGHT_REVIEW_INTERVAL ? "playwright" : "character";

  return {
    ...current,
    totalCharacterTurnsInCycle: total,
    lastSpeakerCharacterId: speakerId,
    nextPhase,
    updatedAt: Date.now(),
  };
}

function nextPlaywrightTurnState(current: RoomTurnState): RoomTurnState {
  return {
    ...current,
    cycleNo: current.cycleNo + 1,
    totalCharacterTurnsInCycle: 0,
    nextPhase: "character",
    updatedAt: Date.now(),
  };
}

interface RoomStartEvent {
  type: "start";
  phase: "character" | "playwright";
  actorType: "character" | "playwright";
  actorId: string;
  actorName: string;
  turnNo: number;
}

interface RoomDeltaEvent {
  type: "delta";
  partType: "text" | "reasoning";
  text: string;
}

interface RoomDoneEvent {
  type: "done";
  payload: RoomGenerationResponse;
}

interface RoomCommitEvent {
  type: "commit";
  message: RoomGenerationResponse["message"];
}

export type RoomStreamEvent = RoomStartEvent | RoomDeltaEvent | RoomCommitEvent | RoomDoneEvent;

export async function* runRoomGenerationStream(
  input: RoomGenerationRequest,
): AsyncGenerator<RoomStreamEvent> {
  const requestId = input.requestId ?? `room-${input.roomId}-${Date.now()}`;
  const { roomConfig, sharedMessages, turnState } = input;
  const nowIso = dayjs().toISOString();
  const turnNo = resolveNextTurnNo(sharedMessages);
  const conversationText = buildRoomConversationText(sharedMessages);
  const modelInstance = await getModel(input.modelConfig);
  const pendingClientFeedback = hasPendingClientFeedback(sharedMessages);

  if (pendingClientFeedback && turnState.nextPhase !== "playwright") {
    const clientFeedback = collectPendingClientFeedback(sharedMessages);

    yield {
      type: "start",
      phase: "playwright",
      actorType: "playwright",
      actorId: roomConfig.playwright.id,
      actorName: roomConfig.playwright.name,
      turnNo,
    };

    const characterTools = createPlaywrightCharacterTools({
      roomConfig,
      requestId,
      roomId: input.roomId,
    });

    const playwrightReplyStream = observedStreamText({
      model: modelInstance.model,
      system: roomConfig.playwright.systemPromptTemplate,
      prompt: buildPlaywrightReplyPrompt({
        roomConfig,
        conversationText,
        clientFeedback,
      }),
      tools: characterTools.tools,
      providerOptions: modelInstance.supportsReasoning
        ? { reasoningSummary: "detailed" as const } as any
        : undefined,
    }, {
      functionId: "room.playwright.reply",
      requestId,
      agentId: "playwright",
      metadata: {
        roomId: input.roomId,
        cycleNo: turnState.cycleNo,
      },
    });

    const replyVisibleParts: Array<{ type: "text"; text: string }> = [];
    const replyRenderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];

    const replyPartCursor: StreamPartCursor = {
      text: "",
      reasoning: "",
    };
    for await (const chunk of playwrightReplyStream.fullStream) {
      const typedChunk = chunk as { type?: string; delta?: string; text?: string };
      if (!typedChunk?.type) {
        continue;
      }

      if (typedChunk.type === "text-delta") {
        const chunkText = resolveStreamChunkDelta(typedChunk, "text", replyPartCursor);
        if (!chunkText) {
          continue;
        }
        const textDelta = chunkText;
        appendDeltaPart(replyRenderParts, "text", textDelta);
        const lastVisible = replyVisibleParts.at(-1);
        if (lastVisible) {
          lastVisible.text += textDelta;
        } else {
          replyVisibleParts.push({ type: "text", text: textDelta });
        }

        yield {
          type: "delta",
          partType: "text",
          text: textDelta,
        };
      }

      if (typedChunk.type === "reasoning-delta") {
        const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", replyPartCursor);
        if (!chunkText) {
          continue;
        }
        const reasoningDelta = chunkText;
        appendDeltaPart(replyRenderParts, "reasoning", reasoningDelta);

        yield {
          type: "delta",
          partType: "reasoning",
          text: reasoningDelta,
        };
      }
    }

    const playwrightReply = replyVisibleParts.map(part => part.text).join("").trim();

    const replyMessage = createTextSharedMessage({
      id: `room-msg-${crypto.randomUUID()}`,
      roomId: input.roomId,
      turnNo,
      actorType: "playwright",
      actorId: roomConfig.playwright.id,
      actorName: roomConfig.playwright.name,
      text: playwrightReply || "已收到用户反馈，我将据此调整后续剧情推进。",
      createdAt: nowIso,
      metadata: {
        messageKind: "playwright-reply",
      },
    });

    if (replyVisibleParts.length > 0) {
      replyMessage.visibleParts = replyVisibleParts
        .map(part => ({ ...part, text: part.text.trim() }))
        .filter(part => part.text.length > 0);
    }
    if (replyRenderParts.length > 0) {
      replyMessage.renderParts = replyRenderParts
        .map(part => ({ ...part, text: part.text.trim() }))
        .filter(part => part.text.length > 0);
    }

    let nextConfig = characterTools.getNextRoomConfig();
    let promptRevision: RoomGenerationResponse["promptRevision"] | undefined;

    try {
      const revisionResult = await observedGenerateText({
        model: modelInstance.model,
        system: roomConfig.playwright.systemPromptTemplate,
        prompt: buildPlaywrightFeedbackRevisionPrompt({
          roomConfig,
          conversationText,
          clientFeedback,
        }),
      }, {
        functionId: "room.playwright.feedback-revision",
        requestId,
        agentId: "playwright",
        metadata: {
          roomId: input.roomId,
          cycleNo: turnState.cycleNo,
        },
      });

      const parsedRevision = parsePlaywrightRevisionJSON(
        extractJSONObject(revisionResult.text),
      );

      const revisionId = createRoomPromptRevisionId();
      const applied = applyPromptRevision({
        roomConfig: nextConfig,
        revision: parsedRevision,
        cycleNo: turnState.cycleNo,
        revisionId,
        createdAt: nowIso,
      });

      nextConfig = applied.nextConfig;
      promptRevision = applied.revisionRecord;
    } catch {
      // 修订失败时保留现有配置，但仍返回编剧对用户的正式回复。
    }

    yield {
      type: "done",
      payload: {
        phase: "playwright",
        message: replyMessage,
        roomConfig: nextConfig,
        promptRevision,
        turnState: {
          ...turnState,
          nextPhase: "character",
          updatedAt: Date.now(),
        },
      },
    };
    return;
  }

  if (turnState.nextPhase === "playwright") {
    yield {
      type: "start",
      phase: "playwright",
      actorType: "playwright",
      actorId: roomConfig.playwright.id,
      actorName: roomConfig.playwright.name,
      turnNo,
    };

    const playwrightPrompt = buildPlaywrightRevisionPrompt({
      roomConfig,
      conversationText,
    });

    const playwrightStream = observedStreamText({
      model: modelInstance.model,
      system: roomConfig.playwright.systemPromptTemplate,
      prompt: playwrightPrompt,
    }, {
      functionId: "room.playwright.cycle-revision",
      requestId,
      agentId: "playwright",
      metadata: {
        roomId: input.roomId,
        cycleNo: turnState.cycleNo,
      },
    });

    let playwrightText = "";
    for await (const textChunk of playwrightStream.textStream) {
      playwrightText += textChunk;
    }
    playwrightText = playwrightText.trim();

    const parsedRevision = parsePlaywrightRevisionJSON(
      extractJSONObject(playwrightText),
    );

    const revisionId = createRoomPromptRevisionId();
    const applied = applyPromptRevision({
      roomConfig,
      revision: parsedRevision,
      cycleNo: turnState.cycleNo,
      revisionId,
      createdAt: nowIso,
    });

    const message = createTextSharedMessage({
      id: `room-msg-${crypto.randomUUID()}`,
      roomId: input.roomId,
      turnNo,
      actorType: "playwright",
      actorId: roomConfig.playwright.id,
      actorName: roomConfig.playwright.name,
      text: `编剧介入完成（第 ${turnState.cycleNo} 周期）：${parsedRevision.rationale}`,
      createdAt: nowIso,
      metadata: {
        messageKind: "playwright-cycle-review",
      },
    });

    yield {
      type: "done",
      payload: {
        phase: "playwright",
        message,
        roomConfig: applied.nextConfig,
        promptRevision: applied.revisionRecord,
        turnState: nextPlaywrightTurnState(turnState),
      },
    };
    return;
  }

  const nextSpeaker = resolveNextSpeaker(roomConfig.characters, turnState);
  const directionPrompt = [
    "你是幕后编剧，请只为当前角色生成本轮导演指令。",
    "必要时你可以调用 createCharacter 工具创建新角色来补齐剧情结构。",
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
  const characterTools = createPlaywrightCharacterTools({
    roomConfig,
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
    tools: characterTools.tools,
    providerOptions: modelInstance.supportsReasoning
      ? { reasoningSummary: "detailed" as const } as any
      : undefined,
  }, {
    functionId: "room.character.direction",
    requestId,
    agentId: "playwright",
    metadata: {
      roomId: input.roomId,
      cycleNo: turnState.cycleNo,
      characterId: nextSpeaker.id,
      characterName: nextSpeaker.name,
    },
  });

  const directionVisibleParts: Array<{ type: "text"; text: string }> = [];
  const directionRenderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];
  const directionCursor: StreamPartCursor = {
    text: "",
    reasoning: "",
  };

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
      yield {
        type: "delta",
        partType: "text",
        text: chunkText,
      };
      continue;
    }

    if (typedChunk.type === "reasoning-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", directionCursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(directionRenderParts, "reasoning", chunkText);
      yield {
        type: "delta",
        partType: "reasoning",
        text: chunkText,
      };
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

  yield {
    type: "commit",
    message: directionMessage,
  };

  const nextConfigFromTools = characterTools.getNextRoomConfig();

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
    metadata: {
      roomId: input.roomId,
      cycleNo: turnState.cycleNo,
      characterName: nextSpeaker.name,
    },
  });

  const characterVisibleParts: Array<{ type: "text"; text: string }> = [];
  const characterRenderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];

  const characterPartCursor: StreamPartCursor = {
    text: "",
    reasoning: "",
  };
  for await (const chunk of characterStream.fullStream) {
    const typedChunk = chunk as { type?: string; delta?: string; text?: string };
    if (!typedChunk?.type) {
      continue;
    }

    if (typedChunk.type === "text-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "text", characterPartCursor);
      if (!chunkText) {
        continue;
      }
      const textDelta = chunkText;
      appendDeltaPart(characterRenderParts, "text", textDelta);
      const lastVisible = characterVisibleParts.at(-1);
      if (lastVisible) {
        lastVisible.text += textDelta;
      } else {
        characterVisibleParts.push({ type: "text", text: textDelta });
      }

      yield {
        type: "delta",
        partType: "text",
        text: textDelta,
      };
    }

    if (typedChunk.type === "reasoning-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", characterPartCursor);
      if (!chunkText) {
        continue;
      }
      const reasoningDelta = chunkText;
      appendDeltaPart(characterRenderParts, "reasoning", reasoningDelta);

      yield {
        type: "delta",
        partType: "reasoning",
        text: reasoningDelta,
      };
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
