import type { TelemetrySettings } from "ai";
import type { TelemetryBuildContext, TelemetryBuildResult } from "./types";

const DEFAULT_SAMPLE_RATE = 1;

function parseBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseSampleRate(): number {
  const raw = process.env.OBSERVABILITY_SAMPLE_RATE;
  if (!raw) {
    return DEFAULT_SAMPLE_RATE;
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    return DEFAULT_SAMPLE_RATE;
  }

  return Math.max(0, Math.min(1, parsed));
}

function isLangfuseConfigured(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

function isObservabilityEnabled(): boolean {
  const provider = (process.env.OBSERVABILITY_PROVIDER || "langfuse").trim().toLowerCase();
  if (provider === "none") {
    return false;
  }

  if (provider === "langfuse") {
    return isLangfuseConfigured();
  }

  return true;
}

function shouldSample(): boolean {
  const sampleRate = parseSampleRate();
  return Math.random() < sampleRate;
}

function normalizeMetadata(
  base: Record<string, unknown>,
  extra?: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {};
  const merged = { ...base, ...extra };

  for (const [key, value] of Object.entries(merged)) {
    if (value == null) {
      continue;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
      continue;
    }

    normalized[key] = JSON.stringify(value);
  }

  return normalized;
}

export function buildTelemetrySettings(context: TelemetryBuildContext): TelemetryBuildResult {
  if (!isObservabilityEnabled() || !shouldSample()) {
    return undefined;
  }

  const recordInputs = parseBooleanEnv("OBSERVABILITY_RECORD_INPUTS", false);
  const recordOutputs = parseBooleanEnv("OBSERVABILITY_RECORD_OUTPUTS", false);
  const environment = process.env.OBSERVABILITY_ENV || process.env.NODE_ENV || "development";

  const metadata = normalizeMetadata(
    {
      requestId: context.requestId,
      agentId: context.agentId,
      environment,
      sessionId: context.requestId,
    },
    context.metadata,
  );

  const telemetry: TelemetrySettings = {
    isEnabled: true,
    functionId: context.functionId,
    recordInputs,
    recordOutputs,
    metadata,
  };

  return telemetry;
}
