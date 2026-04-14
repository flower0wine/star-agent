import dayjs from "dayjs";
import type { RoomGenerationRequest } from "../../types";
import { getModel } from "@/app/api/chat/model";
import { buildRoomConversationText, resolveNextTurnNo } from "../room-context-builder";
import type { RoomStreamEvent } from "./events";
import type { RoomEngineRuntimeContext } from "./context";
import {
  collectPendingClientFeedback,
  hasBootstrapCompleted,
  hasPendingClientFeedback,
} from "./shared";
import { runBootstrapPhase } from "./bootstrap";
import { runPendingFeedbackPhase } from "./feedback";
import { runPreCycleControlPhase, runPlaywrightCycleReviewPhase } from "./playwright";
import { runCharacterPhase } from "./character";

async function buildRuntimeContext(input: RoomGenerationRequest): Promise<RoomEngineRuntimeContext> {
  const requestId = input.requestId ?? `room-${input.roomId}-${Date.now()}`;
  const roomSessionId = `room:${input.roomId}`;
  const nowIso = dayjs().toISOString();
  const turnNo = resolveNextTurnNo(input.sharedMessages);
  const conversationText = buildRoomConversationText(input.sharedMessages);

  const modelInstance = await getModel(input.modelConfig);
  return {
    input,
    requestId,
    roomSessionId,
    nowIso,
    turnNo,
    conversationText,
    modelInstance,
    roomConfig: input.roomConfig,
    turnState: input.turnState,
  };
}

export type { RoomStreamEvent } from "./events";

export async function* runRoomGenerationStream(
  input: RoomGenerationRequest,
): AsyncGenerator<RoomStreamEvent> {
  const context = await buildRuntimeContext(input);
  const { roomConfig, turnState } = context;

  if (!hasBootstrapCompleted(roomConfig)) {
    yield* runBootstrapPhase(context);
    return;
  }

  const pendingClientFeedback = hasPendingClientFeedback(input.sharedMessages);
  if (pendingClientFeedback && turnState.nextPhase !== "playwright") {
    const clientFeedback = collectPendingClientFeedback(input.sharedMessages);
    yield* runPendingFeedbackPhase(context, clientFeedback);
    return;
  }

  if (turnState.nextPhase === "playwright" && !turnState.cycleArmed) {
    const clientFeedback = pendingClientFeedback
      ? collectPendingClientFeedback(input.sharedMessages)
      : "";
    yield* runPreCycleControlPhase(context, clientFeedback);
    return;
  }

  if (turnState.nextPhase === "playwright" && turnState.cycleArmed) {
    yield* runPlaywrightCycleReviewPhase(context);
    return;
  }

  yield* runCharacterPhase(context);
}
