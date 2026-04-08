export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { registerObservability } = await import("@/lib/observability/otel-node");
  registerObservability();
}
