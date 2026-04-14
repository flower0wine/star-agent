import { generateText, streamText } from "ai";
import { buildTelemetrySettings } from "./telemetry";
import type { TelemetryBuildContext } from "./types";

type StreamTextOptions = Parameters<typeof streamText>[0];
type GenerateTextOptions = Parameters<typeof generateText>[0];
export type { GenerateTextOptions, StreamTextOptions };

function mergeTelemetry(
  optionsTelemetry: StreamTextOptions["experimental_telemetry"] | GenerateTextOptions["experimental_telemetry"],
  context: TelemetryBuildContext,
) {
  if (optionsTelemetry !== undefined) {
    return optionsTelemetry;
  }
  return buildTelemetrySettings(context);
}

export function observedStreamText(
  options: StreamTextOptions,
  context: TelemetryBuildContext,
) {
  return streamText({
    ...options,
    experimental_telemetry: mergeTelemetry(options.experimental_telemetry, context),
  });
}

export async function observedGenerateText(
  options: GenerateTextOptions,
  context: TelemetryBuildContext,
) {
  return await generateText({
    ...options,
    experimental_telemetry: mergeTelemetry(options.experimental_telemetry, context),
  });
}
