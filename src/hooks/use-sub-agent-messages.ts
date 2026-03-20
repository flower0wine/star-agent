/**
 * Sub-Agent Messages Hook
 *
 * Handles accumulation of UIMessageChunks into complete UIMessages
 * for rendering in the sub-agent panel.
 *
 * Performance optimized:
 * - Uses refs to avoid unnecessary re-renders during streaming
 * - Batches state updates
 * - Uses direct indexing instead of findIndex
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
  textPartIndex: number;
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
 * Sub-agent messages hook
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
        textPartIndex: -1,
        messageId: null,
        isStreaming: true,
      });
    }
    return statesRef.current.get(taskId)!;
  }, []);

  /**
   * Create a UIMessage from state
   */
  const createMessage = useCallback((state: SubAgentMessageState): UIMessage | null => {
    if (!state.messageId)
      return null;

    return {
      id: state.messageId,
      role: "assistant",
      parts: state.currentMessageParts.length > 0 ? state.currentMessageParts : [],
      metadata: state.totalUsage ? { totalUsage: state.totalUsage } : undefined,
    } as unknown as UIMessage;
  }, []);

  /**
   * Process a message-chunk from sub-agent
   * Optimized to minimize re-renders
   */
  const processChunk = useCallback(
    (taskId: string, chunk: unknown) => {
      if (!chunk || typeof chunk !== "object")
        return;

      const chunkObj = chunk as Record<string, unknown>;
      const state = getOrCreateState(taskId);

      // console.log(chunkObj);


      switch (chunkObj.type) {
        case "text-start": {
          state.messageId = chunkObj.id as string;
          state.isStreaming = true;
          state.textPartIndex = -1;
          break;
        }

        case "text-delta": {
          const delta = chunkObj.delta as string;
          if (!delta)
            break;

          if (state.textPartIndex >= 0) {
            const textPart = state.currentMessageParts[state.textPartIndex] as Record<string, unknown>;
            textPart.text = (textPart.text as string) + delta;
          } else {
            state.textPartIndex = state.currentMessageParts.length;
            state.currentMessageParts.push({ type: "text", text: delta });
          }

          if (!state.isStreaming)
            break;

          const tempMessage = {
            id: `streaming-${state.messageId!}`,
            role: "assistant" as const,
            parts: state.currentMessageParts,
          } as UIMessage;

          setSubAgentMessages((prev) => {
            const next = new Map(prev);
            next.set(taskId, [tempMessage]);
            return next;
          });
          break;
        }

        case "reasoning-start": {
          state.currentMessageParts.push({
            type: "reasoning",
            text: "",
          });
          break;
        }

        case "reasoning-delta": {
          const delta = chunkObj.delta as string;
          if (!delta)
            break;

          const reasoningPart = state.currentMessageParts.at(-1);
          if (reasoningPart && (reasoningPart as Record<string, unknown>).type === "reasoning") {
            (reasoningPart as Record<string, unknown>).text
              = ((reasoningPart as Record<string, unknown>).text as string) + delta;
          }

          if (!state.isStreaming)
            break;

          const tempMessage = {
            id: `streaming-${state.messageId!}`,
            role: "assistant" as const,
            parts: state.currentMessageParts,
          } as UIMessage;

          setSubAgentMessages((prev) => {
            const next = new Map(prev);
            next.set(taskId, [tempMessage]);
            return next;
          });
          break;
        }

        case "reasoning-end": {
          break;
        }

        case "tool-input-start": {
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
          if (!delta)
            break;

          const lastPart = state.currentMessageParts.at(-1);
          if (lastPart && (lastPart as Record<string, unknown>).type === "tool-call") {
            (lastPart as Record<string, unknown>).input
              = ((lastPart as Record<string, unknown>).input as string) + delta;
          }

          if (!state.isStreaming)
            break;

          const tempMessage = {
            id: `streaming-${state.messageId!}`,
            role: "assistant" as const,
            parts: state.currentMessageParts,
          } as UIMessage;

          setSubAgentMessages((prev) => {
            const next = new Map(prev);
            next.set(taskId, [tempMessage]);
            return next;
          });
          break;
        }

        case "tool-input-available": {
          const lastPart = state.currentMessageParts.at(-1);
          if (lastPart && (lastPart as Record<string, unknown>).type === "tool-call") {
            (lastPart as Record<string, unknown>).input = chunkObj.input;
            (lastPart as Record<string, unknown>).state = "input-available";
          }

          if (!state.isStreaming)
            break;

          const tempMessage = {
            id: `streaming-${state.messageId!}`,
            role: "assistant" as const,
            parts: state.currentMessageParts,
          } as UIMessage;

          setSubAgentMessages((prev) => {
            const next = new Map(prev);
            next.set(taskId, [tempMessage]);
            return next;
          });
          break;
        }

        case "tool-output-available": {
          const lastPart = state.currentMessageParts.at(-1);
          if (lastPart && (lastPart as Record<string, unknown>).type === "tool-call") {
            (lastPart as Record<string, unknown>).output = chunkObj.output;
            (lastPart as Record<string, unknown>).state = "output-available";
          }

          if (!state.isStreaming)
            break;

          const tempMessage = {
            id: `streaming-${state.messageId!}`,
            role: "assistant" as const,
            parts: state.currentMessageParts,
          } as UIMessage;

          setSubAgentMessages((prev) => {
            const next = new Map(prev);
            next.set(taskId, [tempMessage]);
            return next;
          });
          break;
        }

        case "tool-output-error": {
          const lastPart = state.currentMessageParts.at(-1);
          if (lastPart && (lastPart as Record<string, unknown>).type === "tool-call") {
            (lastPart as Record<string, unknown>).errorText = chunkObj.errorText;
            (lastPart as Record<string, unknown>).state = "output-error";
          }

          if (!state.isStreaming)
            break;

          const tempMessage = {
            id: `streaming-${state.messageId!}`,
            role: "assistant" as const,
            parts: state.currentMessageParts,
          } as UIMessage;

          setSubAgentMessages((prev) => {
            const next = new Map(prev);
            next.set(taskId, [tempMessage]);
            return next;
          });
          break;
        }

        case "finish": {
          state.isStreaming = false;
          state.finishReason = chunkObj.finishReason as string;
          if (chunkObj.messageMetadata) {
            state.totalUsage = (chunkObj.messageMetadata as Record<string, unknown>)
              .totalUsage as LanguageModelUsage;
          }

          const message = createMessage(state);
          if (message) {
            state.messages.push(message);
            state.currentMessageParts = [];

            setSubAgentMessages((prev) => {
              const next = new Map(prev);
              next.set(taskId, [...state.messages]);
              return next;
            });
          }
          break;
        }

        case "start": {
          if (chunkObj.messageId) {
            state.messageId = chunkObj.messageId as string;
          }
          break;
        }
      }

      // Update cards state - only for non-streaming updates or important events
      if (!state.isStreaming || chunkObj.type === "start" || chunkObj.type === "finish") {
        setSubAgentCards((prev) => {
          const next = new Map(prev);
          const card = next.get(taskId);
          if (card) {
            next.set(taskId, {
              ...card,
              status: state.isStreaming ? "running" : card.status,
              progress: state.isStreaming ? 50 : card.progress,
            });
          }
          return next;
        });
      }
    },
    [getOrCreateState, createMessage]
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

          const state = statesRef.current.get(taskId);
          if (state) {
            state.isStreaming = false;
            const message = createMessage(state);
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
    },
    [createMessage]
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
