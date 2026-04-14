export interface StreamPartCursor {
  text: string;
  reasoning: string;
}

export function appendDeltaPart(
  parts: Array<{ type: "text" | "reasoning"; text: string }>,
  partType: "text" | "reasoning",
  text: string,
) {
  if (!text) {
    return;
  }

  const lastPart = parts.at(-1);
  if (lastPart?.type === partType) {
    lastPart.text += text;
    return;
  }

  parts.push({
    type: partType,
    text,
  });
}

export function resolveStreamChunkDelta(
  chunk: { delta?: string; text?: string },
  partType: "text" | "reasoning",
  cursor: StreamPartCursor,
): string {
  if (typeof chunk.delta === "string" && chunk.delta.length > 0) {
    return chunk.delta;
  }

  if (typeof chunk.text !== "string" || chunk.text.length === 0) {
    return "";
  }

  const previous = partType === "text" ? cursor.text : cursor.reasoning;
  const current = chunk.text;
  let nextDelta = current;

  if (previous.length > 0 && current.startsWith(previous)) {
    nextDelta = current.slice(previous.length);
  } else if (current === previous) {
    nextDelta = "";
  }

  if (partType === "text") {
    cursor.text = current;
  } else {
    cursor.reasoning = current;
  }

  return nextDelta;
}
