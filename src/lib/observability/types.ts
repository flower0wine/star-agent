import type { TelemetrySettings } from "ai";

export type TelemetryFunctionId
  = | "chat.star.stream"
    | "chat.patent.stream"
    | "chat.master.stream"
    | "chat.master.resume"
    | "chat.subagent.run";

export interface TelemetryBuildContext {
  functionId: TelemetryFunctionId;
  requestId: string;
  agentId: string;
  metadata?: Record<string, unknown>;
}

export type TelemetryBuildResult = TelemetrySettings | undefined;

