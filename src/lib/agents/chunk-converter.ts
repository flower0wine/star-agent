/**
 * UIMessageChunk to UIMessage Converter
 *
 * Converts AI SDK UIMessageChunk stream events into complete UIMessage objects.
 * This is a standalone utility that can be used independently of React hooks.
 */

import type {
  UIMessage,
  UIMessagePart,
  LanguageModelUsage,
  UIDataTypes,
  UITools,
} from "ai";

/**
 * Streaming part state
 */
interface StreamingPart {
  type: "text" | "reasoning" | "tool-call";
  text?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  toolCallId?: string;
  toolName?: string;
  state: "streaming" | "input-streaming" | "input-available" | "output-available" | "output-error" | "done";
}

/**
 * Converter state for accumulating chunks into a UIMessage
 */
export interface ChunkConverterState {
  messageId: string | null;
  parts: StreamingPart[];
  textPartIndex: number;
  reasoningPartIndex: number;
  toolPartIndex: number;
  isStreaming: boolean;
  finishReason?: string;
  totalUsage?: LanguageModelUsage;
  currentToolCallId: string | null;
}

/**
 * Result of processing a single chunk
 */
export interface ChunkProcessResult {
  /** Whether the message has been finalized (finish event received) */
  isFinalized: boolean;
  /** The complete UIMessage if finalized */
  message: UIMessage | null;
  /** Whether this chunk triggered a part update */
  partUpdated: boolean;
  /** Current streaming state for UI updates */
  streamingMessage: UIMessage | null;
}

/**
 * Create initial converter state
 */
export function createConverterState(): ChunkConverterState {
  return {
    messageId: null,
    parts: [],
    textPartIndex: -1,
    reasoningPartIndex: -1,
    toolPartIndex: -1,
    isStreaming: false,
    finishReason: undefined,
    totalUsage: undefined,
    currentToolCallId: null,
  };
}

/**
 * Convert a UIMessageChunk-like object to a StreamingPart
 *
 * @param chunk - The chunk object from the stream
 * @param state - Current converter state
 * @returns The updated streaming part or null if not applicable
 */
function processChunkToPart(
  chunk: Record<string, unknown>,
  state: ChunkConverterState
): StreamingPart | null {
  const chunkType = chunk.type as string;

  switch (chunkType) {
    case "text-start": {
      const part: StreamingPart = {
        type: "text",
        text: "",
        state: "streaming",
      };
      state.textPartIndex = state.parts.length;
      state.parts.push(part);
      return part;
    }

    case "reasoning-start": {
      const part: StreamingPart = {
        type: "reasoning",
        text: "",
        state: "streaming",
      };
      state.reasoningPartIndex = state.parts.length;
      state.parts.push(part);
      return part;
    }

    case "tool-input-start": {
      const part: StreamingPart = {
        type: "tool-call",
        toolCallId: chunk.toolCallId as string,
        toolName: chunk.toolName as string,
        input: "",
        state: "input-streaming",
      };
      state.toolPartIndex = state.parts.length;
      state.currentToolCallId = chunk.toolCallId as string;
      state.parts.push(part);
      return part;
    }

    case "tool-input-available": {
      if (state.toolPartIndex >= 0) {
        const part = state.parts[state.toolPartIndex];
        (part as StreamingPart & { input: unknown }).input = chunk.input;
        part.state = "input-available";
        return part;
      }
      return null;
    }

    case "tool-output-available": {
      if (state.toolPartIndex >= 0) {
        const part = state.parts[state.toolPartIndex];
        part.output = chunk.output;
        part.state = "output-available";
        return part;
      }
      return null;
    }

    case "tool-output-error": {
      if (state.toolPartIndex >= 0) {
        const part = state.parts[state.toolPartIndex];
        part.errorText = chunk.errorText as string;
        part.state = "output-error";
        return part;
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Process a text delta into the current text part
 */
function processTextDelta(delta: string, state: ChunkConverterState): boolean {
  if (state.textPartIndex >= 0) {
    const part = state.parts[state.textPartIndex];
    if (part && part.type === "text") {
      part.text = (part.text || "") + delta;
      return true;
    }
  }
  return false;
}

/**
 * Process a reasoning delta into the current reasoning part
 */
function processReasoningDelta(delta: string, state: ChunkConverterState): boolean {
  if (state.reasoningPartIndex >= 0) {
    const part = state.parts[state.reasoningPartIndex];
    if (part && part.type === "reasoning") {
      part.text = (part.text || "") + delta;
      return true;
    }
  }
  return false;
}

/**
 * Process a tool input delta into the current tool part
 */
function processToolInputDelta(delta: string, state: ChunkConverterState): boolean {
  if (state.toolPartIndex >= 0) {
    const part = state.parts[state.toolPartIndex];
    if (part && part.type === "tool-call" && part.state === "input-streaming") {
      const currentInput = typeof part.input === "string" ? part.input : "";
      part.input = currentInput + delta;
      return true;
    }
  }
  return false;
}

/**
 * Finalize a streaming part (set state to "done")
 */
function finalizePart(type: "text" | "reasoning", state: ChunkConverterState): boolean {
  const index = type === "text" ? state.textPartIndex : state.reasoningPartIndex;
  if (index >= 0) {
    const part = state.parts[index];
    if (part && part.type === type) {
      part.state = "done";
      return true;
    }
  }
  return false;
}

/**
 * Convert StreamingPart array to UIMessagePart array
 */
function toUIMessageParts(parts: StreamingPart[]): UIMessagePart<UIDataTypes, UITools>[] {
  return parts.map((part): UIMessagePart<UIDataTypes, UITools> => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text || "",
        state: part.state as "streaming" | "done",
      } as UIMessagePart<UIDataTypes, UITools>;
    }

    if (part.type === "reasoning") {
      return {
        type: "reasoning",
        text: part.text || "",
        state: part.state as "streaming" | "done",
      } as UIMessagePart<UIDataTypes, UITools>;
    }

    if (part.type === "tool-call") {
      const toolPart: StreamingPart & { toolCallId: string; toolName: string; input: unknown } = part as StreamingPart & {
        toolCallId: string;
        toolName: string;
        input: unknown;
      };
      return {
        type: "tool-call",
        toolCallId: toolPart.toolCallId,
        toolName: toolPart.toolName,
        input: toolPart.input || {},
        state: part.state as "input-streaming" | "input-available" | "output-available" | "output-error",
        output: part.output,
        errorText: part.errorText,
      } as UIMessagePart<UIDataTypes, UITools>;
    }

    throw new Error(`Unknown part type: ${String(part.type)}`);
  });
}

/**
 * Create a streaming UIMessage from current state
 */
function createStreamingMessage(state: ChunkConverterState): UIMessage | null {
  if (!state.messageId && state.parts.length === 0) {
    return null;
  }

  return {
    id: state.messageId || `streaming-${Date.now()}`,
    role: "assistant",
    parts: toUIMessageParts(state.parts),
    metadata: state.totalUsage ? { totalUsage: state.totalUsage } : undefined,
  } as UIMessage;
}

function extractUsageFromFinishChunk(chunkObj: Record<string, unknown>): LanguageModelUsage | undefined {
  const metadata = chunkObj.messageMetadata;
  if (metadata && typeof metadata === "object") {
    const fromMetadata = (metadata as Record<string, unknown>).totalUsage;
    if (fromMetadata && typeof fromMetadata === "object") {
      return fromMetadata as LanguageModelUsage;
    }
  }

  const totalUsage = chunkObj.totalUsage;
  if (totalUsage && typeof totalUsage === "object") {
    return totalUsage as LanguageModelUsage;
  }

  const usage = chunkObj.usage;
  if (usage && typeof usage === "object") {
    return usage as LanguageModelUsage;
  }

  return undefined;
}
/**
 * Process a single chunk and update the converter state
 *
 * @param chunk - The chunk object (should match UIMessageChunk structure)
 * @param state - The current converter state
 * @returns ChunkProcessResult with updated state information
 */
export function processChunk(
  chunk: unknown,
  state: ChunkConverterState
): ChunkProcessResult {
  if (!chunk || typeof chunk !== "object") {
    return {
      isFinalized: false,
      message: null,
      partUpdated: false,
      streamingMessage: createStreamingMessage(state),
    };
  }

  const chunkObj = chunk as Record<string, unknown>;
  const chunkType = chunkObj.type as string;

  switch (chunkType) {
    case "start": {
      state.messageId = (chunkObj.messageId as string) || null;
      state.isStreaming = true;
      return {
        isFinalized: false,
        message: null,
        partUpdated: false,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "text-start": {
      processChunkToPart(chunkObj, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "text-delta": {
      const delta = chunkObj.delta as string;
      const updated = processTextDelta(delta, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: updated,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "text-end": {
      finalizePart("text", state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "reasoning-start": {
      processChunkToPart(chunkObj, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "reasoning-delta": {
      const delta = chunkObj.delta as string;
      const updated = processReasoningDelta(delta, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: updated,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "reasoning-end": {
      finalizePart("reasoning", state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "tool-input-start": {
      processChunkToPart(chunkObj, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "tool-input-delta": {
      const delta = chunkObj.inputTextDelta as string;
      const updated = processToolInputDelta(delta, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: updated,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "tool-input-available": {
      processChunkToPart(chunkObj, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "tool-output-available": {
      processChunkToPart(chunkObj, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "tool-output-error": {
      processChunkToPart(chunkObj, state);
      return {
        isFinalized: false,
        message: null,
        partUpdated: true,
        streamingMessage: createStreamingMessage(state),
      };
    }

    case "finish": {
      state.finishReason = chunkObj.finishReason as string;
      const finishUsage = extractUsageFromFinishChunk(chunkObj);
      if (finishUsage) {
        state.totalUsage = finishUsage;
      }

      const message: UIMessage = {
        id: state.messageId || `final-${Date.now()}`,
        role: "assistant",
        parts: toUIMessageParts(state.parts),
        metadata: state.totalUsage ? { totalUsage: state.totalUsage } : undefined,
      } as UIMessage;

      state.isStreaming = false;
      state.parts = [];
      state.textPartIndex = -1;
      state.reasoningPartIndex = -1;
      state.toolPartIndex = -1;
      state.messageId = null;
      state.totalUsage = undefined;

      return {
        isFinalized: true,
        message,
        partUpdated: true,
        streamingMessage: null,
      };
    }

    default:
      return {
        isFinalized: false,
        message: null,
        partUpdated: false,
        streamingMessage: createStreamingMessage(state),
      };
  }
}

/**
 * ChunkConverter class for managing multiple concurrent message streams
 *
 * Usage:
 * ```typescript
 * const converter = new ChunkConverter();
 *
 * // Process chunks for a specific task
 * const result1 = converter.processChunk(taskId1, chunk1);
 * const result2 = converter.processChunk(taskId1, chunk2);
 *
 * // Get current state for a task
 * const state = converter.getState(taskId1);
 *
 * // Remove a task when done
 * converter.removeTask(taskId1);
 * ```
 */
export class ChunkConverter {
  private states = new Map<string, ChunkConverterState>();

  /**
   * Get or create state for a task
   */
  private getOrCreateState(taskId: string): ChunkConverterState {
    if (!this.states.has(taskId)) {
      this.states.set(taskId, createConverterState());
    }
    return this.states.get(taskId)!;
  }

  /**
   * Process a chunk for a specific task
   */
  processChunk(taskId: string, chunk: unknown): ChunkProcessResult {
    const state = this.getOrCreateState(taskId);
    return processChunk(chunk, state);
  }

  /**
   * Get current state for a task
   */
  getState(taskId: string): ChunkConverterState | undefined {
    return this.states.get(taskId);
  }

  /**
   * Get current streaming message for a task
   */
  getStreamingMessage(taskId: string): UIMessage | null {
    const state = this.states.get(taskId);
    if (!state)
      return null;
    return createStreamingMessage(state);
  }

  /**
   * Get all streaming messages (one per task)
   */
  getAllStreamingMessages(): Map<string, UIMessage> {
    const result = new Map<string, UIMessage>();
    this.states.forEach((state, taskId) => {
      const message = createStreamingMessage(state);
      if (message)
        result.set(taskId, message);
    });
    return result;
  }

  /**
   * Remove a task and its state
   */
  removeTask(taskId: string): void {
    this.states.delete(taskId);
  }

  /**
   * Reset all tasks
   */
  reset(): void {
    this.states.clear();
  }
}

/**
 * Convert a UIMessageChunk array to a complete UIMessage
 *
 * This is a convenience function for when you have all chunks already collected.
 *
 * @param chunks - Array of UIMessageChunk-like objects
 * @returns Complete UIMessage
 */
export function chunksToMessage(chunks: unknown[]): UIMessage | null {
  const state = createConverterState();

  for (const chunk of chunks) {
    const result = processChunk(chunk, state);
    if (result.isFinalized) {
      return result.message;
    }
  }

  if (state.messageId || state.parts.length > 0) {
    return createStreamingMessage(state);
  }

  return null;
}

