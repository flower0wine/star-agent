import { observedGenerateText, observedStreamText } from "@/lib/observability/ai-sdk";
import { createRoomPromptRevisionId } from "../../defaults";
import { createTextSharedMessage } from "../../message-share-filter";
import { applyPromptRevision, parsePlaywrightRevisionJSON } from "../../playwright-policy";
import type { RoomGenerationResponse } from "../../types";
import type { RoomStreamEvent } from "./events";
import type { RoomEngineRuntimeContext } from "./context";
import { appendDeltaPart, resolveStreamChunkDelta } from "./stream";
import {
  buildPlaywrightFeedbackRevisionPrompt,
  buildPlaywrightReplyPrompt,
  extractJSONObject,
} from "./shared";
import { createPlaywrightControlTools } from "./tools";

export async function* runPendingFeedbackPhase(
  context: RoomEngineRuntimeContext,
  clientFeedback: string,
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

  const replyStream = observedStreamText({
    model: modelInstance.model,
    system: roomConfig.playwright.systemPromptTemplate,
    prompt: buildPlaywrightReplyPrompt({
      roomConfig,
      conversationText,
      clientFeedback,
    }),
    tools: controlTools.tools,
    providerOptions: modelInstance.supportsReasoning
      ? { reasoningSummary: "detailed" as const } as any
      : undefined,
  }, {
    functionId: "room.playwright.reply",
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

  for await (const chunk of replyStream.fullStream) {
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
      yield { type: "delta", partType: "text", text: chunkText };
      continue;
    }

    if (typedChunk.type === "reasoning-delta") {
      const chunkText = resolveStreamChunkDelta(typedChunk, "reasoning", cursor);
      if (!chunkText) {
        continue;
      }
      appendDeltaPart(renderParts, "reasoning", chunkText);
      yield { type: "delta", partType: "reasoning", text: chunkText };
    }
  }

  const replyText = visibleParts.map(part => part.text).join("").trim();
  const message = createTextSharedMessage({
    id: `room-msg-${crypto.randomUUID()}`,
    roomId: input.roomId,
    turnNo,
    actorType: "playwright",
    actorId: roomConfig.playwright.id,
    actorName: roomConfig.playwright.name,
    text: replyText || "已收到用户反馈，我将据此调整后续剧情推进。",
    createdAt: nowIso,
    metadata: {
      messageKind: "playwright-reply",
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

  let nextConfig = controlTools.getNextRoomConfig();
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
      sessionId: roomSessionId,
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
      message,
      roomConfig: nextConfig,
      promptRevision,
      turnState: {
        ...controlTools.getNextTurnState(),
        updatedAt: Date.now(),
      },
    },
  };
}
