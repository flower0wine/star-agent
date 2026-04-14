import dayjs from "dayjs";
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

function hasPendingClientFeedback(messages: RoomGenerationRequest["sharedMessages"]): boolean {
  const lastUserTurn = getLastTurnNoByActorType(messages, "user");
  const lastPlaywrightTurn = getLastTurnNoByActorType(messages, "playwright");
  return lastUserTurn > lastPlaywrightTurn;
}

function collectPendingClientFeedback(messages: RoomGenerationRequest["sharedMessages"]): string {
  const lastPlaywrightTurn = getLastTurnNoByActorType(messages, "playwright");
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

async function buildPlaywrightDirection(input: {
  requestId: string;
  model: any;
  roomConfig: RoomConfig;
  characterId: string;
  characterName: string;
  conversationText: string;
}): Promise<string> {
  const prompt = [
    "你是幕后编剧，请只为当前角色生成本轮导演指令。",
    "你必须遵循用户创作指令。",
    "",
    "用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    `当前角色: ${input.characterName} (${input.characterId})`,
    "请输出 3-5 行短指令，包含：目标、冲突、语气、下一步动作。",
    "禁止输出 JSON，禁止解释规则，只输出可执行导演指令。",
    "",
    "当前对话：",
    input.conversationText || "（暂无历史）",
  ].join("\n");

  const result = await observedGenerateText({
    model: input.model,
    system: input.roomConfig.playwright.systemPromptTemplate,
    prompt,
  }, {
    functionId: "room.character.direction",
    requestId: input.requestId,
    agentId: "playwright",
    metadata: {
      roomId: input.roomConfig.roomId,
      characterId: input.characterId,
      characterName: input.characterName,
    },
  });

  const text = result.text.trim();
  if (!text) {
    return "保持角色核心动机，推动冲突升级并给出明确行动。";
  }
  return text;
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
    "字段要求：worldPromptTemplate, storyBible, plotOutline, characterPromptPatches, rationale。",
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
  text: string;
}

interface RoomDoneEvent {
  type: "done";
  payload: RoomGenerationResponse;
}

export type RoomStreamEvent = RoomStartEvent | RoomDeltaEvent | RoomDoneEvent;

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

    const playwrightReplyStream = observedStreamText({
      model: modelInstance.model,
      system: roomConfig.playwright.systemPromptTemplate,
      prompt: buildPlaywrightReplyPrompt({
        roomConfig,
        conversationText,
        clientFeedback,
      }),
    }, {
      functionId: "room.playwright.reply",
      requestId,
      agentId: "playwright",
      metadata: {
        roomId: input.roomId,
        cycleNo: turnState.cycleNo,
      },
    });

    let playwrightReply = "";
    for await (const textChunk of playwrightReplyStream.textStream) {
      playwrightReply += textChunk;
      if (textChunk) {
        yield {
          type: "delta",
          text: textChunk,
        };
      }
    }
    playwrightReply = playwrightReply.trim();

    const replyMessage = createTextSharedMessage({
      id: `room-msg-${crypto.randomUUID()}`,
      roomId: input.roomId,
      turnNo,
      actorType: "playwright",
      actorId: roomConfig.playwright.id,
      actorName: roomConfig.playwright.name,
      text: playwrightReply || "已收到用户反馈，我将据此调整后续剧情推进。",
      createdAt: nowIso,
    });

    let nextConfig = roomConfig;
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
        roomConfig,
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
  const playwrightDirection = await buildPlaywrightDirection({
    requestId,
    model: modelInstance.model,
    roomConfig,
    characterId: nextSpeaker.id,
    characterName: nextSpeaker.name,
    conversationText,
  });

  yield {
    type: "start",
    phase: "character",
    actorType: "character",
    actorId: nextSpeaker.id,
    actorName: nextSpeaker.name,
    turnNo,
  };

  const characterStream = observedStreamText({
    model: modelInstance.model,
    system: buildCharacterSystemPrompt({
      roomConfig,
      characterId: nextSpeaker.id,
      playwrightDirection,
    }),
    prompt: buildCharacterPrompt(conversationText),
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
  let characterText = "";
  for await (const textChunk of characterStream.textStream) {
    characterText += textChunk;
    if (textChunk) {
      yield {
        type: "delta",
        text: textChunk,
      };
    }
  }
  characterText = characterText.trim();

  const message = createTextSharedMessage({
    id: `room-msg-${crypto.randomUUID()}`,
    roomId: input.roomId,
    turnNo,
    actorType: "character",
    actorId: nextSpeaker.id,
    actorName: nextSpeaker.name,
    text: characterText,
    createdAt: nowIso,
  });

  yield {
    type: "done",
    payload: {
      phase: "character",
      message,
      turnState: nextCharacterTurnState(turnState, nextSpeaker.id),
    },
  };
}
