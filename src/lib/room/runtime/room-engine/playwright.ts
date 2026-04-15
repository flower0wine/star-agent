import { observedStreamText } from "@/lib/observability/ai-sdk";
import { stepCountIs } from "ai";
import { createTextSharedMessage } from "../../message-share-filter";
import { buildPlaywrightRevisionPrompt, parsePlaywrightRevisionJSON, applyPromptRevision } from "../../playwright-policy";
import { createRoomPromptRevisionId } from "../../defaults";
import type { RoomStreamEvent } from "./events";
import type { RoomEngineRuntimeContext } from "./context";
import { appendDeltaPart, resolveStreamChunkDelta } from "./stream";
import { buildPlaywrightControlPrompt, extractJSONObject, nextPlaywrightTurnState } from "./shared";
import { createPlaywrightControlTools } from "./tools";

export async function* runPreCycleControlPhase(
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

  const controlStream = observedStreamText({
    model: modelInstance.model,
    system: roomConfig.playwright.systemPromptTemplate,
    prompt: buildPlaywrightControlPrompt({
      roomConfig,
      conversationText,
      clientFeedback,
    }),
    tools: controlTools.tools,
    stopWhen: stepCountIs(12),
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
      mode: "control",
    },
  });

  const visibleParts: Array<{ type: "text"; text: string }> = [];
  const renderParts: Array<{ type: "text" | "reasoning"; text: string }> = [];
  const cursor = { text: "", reasoning: "" };

  for await (const chunk of controlStream.fullStream) {
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

  const text = visibleParts.map(part => part.text).join("").trim() || "当前处于准备阶段，等待你确认后开启轮回。";
  const message = createTextSharedMessage({
    id: `room-msg-${crypto.randomUUID()}`,
    roomId: input.roomId,
    turnNo,
    actorType: "playwright",
    actorId: roomConfig.playwright.id,
    actorName: roomConfig.playwright.name,
    text,
    createdAt: nowIso,
    metadata: {
      messageKind: "playwright-control",
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

  yield {
    type: "done",
    payload: {
      phase: "playwright",
      message,
      roomConfig: controlTools.getNextRoomConfig(),
      turnState: {
        ...controlTools.getNextTurnState(),
        updatedAt: Date.now(),
      },
    },
  };
}

export async function* runPlaywrightCycleReviewPhase(
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
    sessionId: roomSessionId,
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
}
