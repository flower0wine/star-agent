import type { RoomGenerationResponse } from "../../types";

export interface RoomStartEvent {
  type: "start";
  phase: "character" | "playwright";
  actorType: "character" | "playwright";
  actorId: string;
  actorName: string;
  turnNo: number;
}

export interface RoomDeltaEvent {
  type: "delta";
  partType: "text" | "reasoning";
  text: string;
}

export interface RoomDoneEvent {
  type: "done";
  payload: RoomGenerationResponse;
}

export interface RoomCommitEvent {
  type: "commit";
  message: RoomGenerationResponse["message"];
}

export type RoomStreamEvent = RoomStartEvent | RoomDeltaEvent | RoomCommitEvent | RoomDoneEvent;
