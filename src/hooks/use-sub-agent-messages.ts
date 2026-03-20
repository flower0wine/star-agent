/**
 * Sub-Agent Messages Hook
 *
 * Handles accumulation of UIMessageChunks into complete UIMessages
 * for rendering in the sub-agent panel.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type {
  UIMessage,
  UIMessagePart,
  LanguageModelUsage,
  UIDataTypes,
  UITools,
} from "ai";
import type { SubAgentCard } from "@/types/agent";

/**
 * Accumulated message state for a single sub-agent
 */
interface SubAgentMessageState {
  messages: UIMessage[];
  currentMessageParts: UIMessagePart<UIDataTypes, UITools>[];
  currentReasoning: { text: string; isStreaming: boolean } | null;
  currentToolCall: {
    toolCallId: string;
    toolName: string;
    input: unknown;
  } | null;
  messageId: string | null;
  isStreaming: boolean;
  finishReason?: string;
  totalUsage?: LanguageModelUsage;
}

/**
 * Hook options
 */
interface UseSubAgentMessagesOptions {
  /** Callback when sub-agent cards need update */
  onSubAgentUpdate?: (cards: Map<string, SubAgentCard>) => void;
}

/**
 * Hook return type
 */
export interface UseSubAgentMessagesReturn {
  /** Current sub-agent messages map */
  subAgentMessages: Map<string, UIMessage[]>;
  /** Sub-agent cards with status */
  subAgentCards: Map<string, SubAgentCard>;
  /** Process a message-chunk event */
  processChunk: (taskId: string, chunk: unknown) => void;
  /** Handle progress/complete/error events */
  handleProgress: (
    taskId: string,
    progressType: string,
    progress?: number,
    result?: string,
    error?: string
  ) => void;
  /** Reset all messages */
  reset: () => void;
  /** Remove a specific sub-agent */
  removeSubAgent: (taskId: string) => void;
}

/**
 * Convert UIMessageChunk parts to UIMessage
 */
function createUIMessage(state: SubAgentMessageState): UIMessage | null {
  if (!state.messageId)
    return null;

  return {
    id: state.messageId,
    role: "assistant",
    parts: state.currentMessageParts.length > 0 ? state.currentMessageParts : [],
    metadata: state.totalUsage ? { totalUsage: state.totalUsage } : undefined,
  } as unknown as UIMessage;
}

/**
 * Sub-agent messages hook
 *
 * Manages multiple sub-agent message streams and their accumulation.
 */
export function useSubAgentMessages(
  options: UseSubAgentMessagesOptions = {}
): UseSubAgentMessagesReturn {
  const { onSubAgentUpdate } = options;

  const [subAgentMessages, setSubAgentMessages] = useState<Map<string, UIMessage[]>>(
    new Map()
  );

  const [subAgentCards, setSubAgentCards] = useState<Map<string, SubAgentCard>>(
    new Map()
  );

  const statesRef = useRef<Map<string, SubAgentMessageState>>(new Map());

  /**
   * Initialize or get state for a task
   */
  const getOrCreateState = useCallback((taskId: string): SubAgentMessageState => {
    if (!statesRef.current.has(taskId)) {
      statesRef.current.set(taskId, {
        messages: [],
        currentMessageParts: [],
        currentReasoning: null,
        currentToolCall: null,
        messageId: null,
        isStreaming: true,
      });
    }
    return statesRef.current.get(taskId)!;
  }, []);

  /**
   * Process a message-chunk from sub-agent
   */
  const processChunk = useCallback(
    (taskId: string, chunk: unknown) => {
      if (!chunk || typeof chunk !== "object")
        return;

      const chunkObj = chunk as Record<string, unknown>;
      const state = getOrCreateState(taskId);

      switch (chunkObj.type) {
        case "text-start": {
          state.messageId = chunkObj.id as string;
          state.isStreaming = true;
          break;
        }

        case "text-delta": {
          const delta = chunkObj.delta as string;
          if (delta) {
            const textPartIndex = state.currentMessageParts.findIndex(
              (p) => typeof p === "object" && (p as Record<string, unknown>).type === "text"
            );
            if (textPartIndex >= 0) {
              const textPart = state.currentMessageParts[textPartIndex] as Record<string, unknown>;
              textPart.text = (textPart.text as string) + delta;
            } else {
              state.currentMessageParts.push({ type: "text", text: delta });
            }
          }
          break;
        }

        case "reasoning-start": {
          state.currentReasoning = { text: "", isStreaming: true };
          state.currentMessageParts.push({
            type: "reasoning",
            text: "",
          });
          break;
        }

        case "reasoning-delta": {
          const delta = chunkObj.delta as string;
          if (delta && state.currentReasoning) {
            state.currentReasoning.text += delta;
            const reasoningPart = state.currentMessageParts.find(
              (p) => typeof p === "object" && (p as Record<string, unknown>).type === "reasoning"
            );
            if (reasoningPart) {
              (reasoningPart as Record<string, unknown>).text = state.currentReasoning.text;
            }
          }
          break;
        }

        case "reasoning-end": {
          if (state.currentReasoning) {
            state.currentReasoning.isStreaming = false;
          }
          break;
        }

        case "tool-input-start": {
          state.currentToolCall = {
            toolCallId: chunkObj.toolCallId as string,
            toolName: chunkObj.toolName as string,
            input: {},
          };
          state.currentMessageParts.push({
            type: "tool-call",
            toolCallId: chunkObj.toolCallId as string,
            toolName: chunkObj.toolName as string,
            input: {},
            state: "input-streaming",
          } as unknown as UIMessagePart<UIDataTypes, UITools>);
          break;
        }

        case "tool-input-delta": {
          const delta = chunkObj.inputTextDelta as string;
          if (delta && state.currentToolCall) {
            state.currentToolCall.input = (
              state.currentToolCall.input as string
            ) + delta;
            const toolPart = state.currentMessageParts.find(
              (p) =>
                typeof p === "object"
                && (p as Record<string, unknown>).toolCallId === state.currentToolCall?.toolCallId
            );
            if (toolPart && typeof toolPart === "object") {
              (toolPart as Record<string, unknown>).input = state.currentToolCall.input;
            }
          }
          break;
        }

        case "tool-input-available": {
          const toolPart = state.currentMessageParts.find(
            (p) =>
              typeof p === "object"
              && (p as Record<string, unknown>).toolCallId === chunkObj.toolCallId
          );
          if (toolPart && typeof toolPart === "object") {
            (toolPart as Record<string, unknown>).input = chunkObj.input;
            (toolPart as Record<string, unknown>).state = "input-available";
          }
          break;
        }

        case "tool-output-available": {
          const toolPart = state.currentMessageParts.find(
            (p) =>
              typeof p === "object"
              && (p as Record<string, unknown>).toolCallId === chunkObj.toolCallId
          );
          if (toolPart && typeof toolPart === "object") {
            (toolPart as Record<string, unknown>).output = chunkObj.output;
            (toolPart as Record<string, unknown>).state = "output-available";
          }
          break;
        }

        case "tool-output-error": {
          const toolPart = state.currentMessageParts.find(
            (p) =>
              typeof p === "object"
              && (p as Record<string, unknown>).toolCallId === chunkObj.toolCallId
          );
          if (toolPart && typeof toolPart === "object") {
            (toolPart as Record<string, unknown>).errorText = chunkObj.errorText;
            (toolPart as Record<string, unknown>).state = "output-error";
          }
          break;
        }

        case "finish": {
          state.isStreaming = false;
          state.finishReason = chunkObj.finishReason as string;
          if (chunkObj.messageMetadata) {
            state.totalUsage = (chunkObj.messageMetadata as Record<string, unknown>)
              .totalUsage as LanguageModelUsage;
          }

          // Finalize current message
          const message = createUIMessage(state);
          if (message) {
            state.messages.push(message);
          }
          state.currentMessageParts = [];
          break;
        }

        case "start": {
          if (chunkObj.messageId) {
            state.messageId = chunkObj.messageId as string;
          }
          break;
        }
      }

      // Update messages state
      setSubAgentMessages((prev) => {
        const next = new Map(prev);
        next.set(taskId, [...state.messages]);
        return next;
      });

      // Update cards state to show running
      setSubAgentCards((prev) => {
        const next = new Map(prev);
        const card = next.get(taskId);
        if (card) {
          next.set(taskId, { ...card, status: "running", progress: 50 });
        }
        return next;
      });

      onSubAgentUpdate?.(subAgentCards);
    },
    [getOrCreateState, onSubAgentUpdate, subAgentCards]
  );

  /**
   * Handle progress/complete/error events
   */
  const handleProgress = useCallback(
    (
      taskId: string,
      progressType: string,
      progress?: number,
      result?: string,
      error?: string
    ) => {
      setSubAgentCards((prev) => {
        const next = new Map(prev);

        if (progressType === "start") {
          next.set(taskId, {
            taskId,
            status: "running",
            task: "",
            reposCount: 0,
            progress: 0,
            currentOutput: "",
            finalResult: undefined,
            error: undefined,
          });
        } else if (progressType === "complete") {
          const card = next.get(taskId);
          if (card) {
            next.set(taskId, {
              ...card,
              status: "completed",
              progress: 100,
              finalResult: result,
            });
          }

          // Finalize streaming for this task
          const state = statesRef.current.get(taskId);
          if (state) {
            state.isStreaming = false;
            const message = createUIMessage(state);
            if (message) {
              state.messages.push(message);
              setSubAgentMessages((prevMsgs) => {
                const nextMsgs = new Map(prevMsgs);
                nextMsgs.set(taskId, [...state.messages]);
                return nextMsgs;
              });
            }
          }
        } else if (progressType === "error") {
          const card = next.get(taskId);
          if (card) {
            next.set(taskId, {
              ...card,
              status: "failed",
              progress: progress ?? card.progress,
              error,
            });
          }
        } else if (progressType === "progress") {
          const card = next.get(taskId);
          if (card) {
            next.set(taskId, {
              ...card,
              progress: progress ?? card.progress,
            });
          }
        }

        return next;
      });

      onSubAgentUpdate?.(subAgentCards);
    },
    [onSubAgentUpdate, subAgentCards]
  );

  /**
   * Reset all messages
   */
  const reset = useCallback(() => {
    setSubAgentMessages(new Map());
    setSubAgentCards(new Map());
    statesRef.current.clear();
  }, []);

  /**
   * Remove a specific sub-agent
   */
  const removeSubAgent = useCallback((taskId: string) => {
    setSubAgentMessages((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
    setSubAgentCards((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
    statesRef.current.delete(taskId);
  }, []);

  return {
    subAgentMessages,
    subAgentCards,
    processChunk,
    handleProgress,
    reset,
    removeSubAgent,
  };
}
