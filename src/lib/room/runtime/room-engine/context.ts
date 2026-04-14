import type { RoomConfig, RoomGenerationRequest, RoomTurnState } from "../../types";
import type { ModelInstance } from "@/app/api/chat/model";

export interface RoomEngineRuntimeContext {
  input: RoomGenerationRequest;
  requestId: string;
  roomSessionId: string;
  nowIso: string;
  turnNo: number;
  conversationText: string;
  modelInstance: ModelInstance;
  roomConfig: RoomConfig;
  turnState: RoomTurnState;
}
