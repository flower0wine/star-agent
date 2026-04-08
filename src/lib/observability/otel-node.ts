import { LangfuseSpanProcessor } from "@langfuse/otel";
import type { ShouldExportSpan } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const OTEL_INIT_FLAG = "__STAR_AGENT_OTEL_INITIALIZED__";

const shouldExportSpan: ShouldExportSpan = (span) => {
  return span.otelSpan.instrumentationScope.name !== "next.js";
};

function isLangfuseConfigured(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}

function isInitialized(): boolean {
  return Boolean((globalThis as Record<string, unknown>)[OTEL_INIT_FLAG]);
}

function markInitialized(): void {
  (globalThis as Record<string, unknown>)[OTEL_INIT_FLAG] = true;
}

export function registerObservability(): void {
  if (isInitialized()) {
    return;
  }

  if (!isLangfuseConfigured()) {
    console.log("[observability] Langfuse disabled: missing LANGFUSE_PUBLIC_KEY or LANGFUSE_SECRET_KEY");
    return;
  }

  const langfuseSpanProcessor = new LangfuseSpanProcessor({
    shouldExportSpan,
  });

  const tracerProvider = new NodeTracerProvider({
    spanProcessors: [langfuseSpanProcessor],
  });

  tracerProvider.register();
  markInitialized();
  console.log("[observability] OpenTelemetry initialized with LangfuseSpanProcessor");
}
