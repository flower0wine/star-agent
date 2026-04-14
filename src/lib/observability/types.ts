import type { TelemetrySettings } from "ai";

export type TelemetryFunctionId
  = | "chat.star.stream"
    | "chat.patent.stream"
    | "chat.master.stream"
    | "chat.master.resume"
    | "chat.subagent.run"
    | "room.character.direction"
    | "room.character.stream"
    | "room.playwright.reply"
    | "room.playwright.feedback-revision"
    | "room.playwright.cycle-revision";

export interface TelemetryBuildContext {
  functionId: TelemetryFunctionId;
  requestId: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export type TelemetryBuildResult = TelemetrySettings | undefined;

