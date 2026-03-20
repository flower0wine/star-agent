/**
 * Sub-Agent Messages Hook
 *
 * Handles accumulation of UIMessageChunks into complete UIMessages
 * for rendering in the sub-agent panel.
 *
 * Uses ChunkConverter for streaming message assembly.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type { UIMessage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { ChunkConverter } from "@/lib/agents/chunk-converter";

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

  const converterRef = useRef<ChunkConverter>(new ChunkConverter());

  /**
   * Get or create a completed messages array for a task
   */
  const getOrCreateMessages = useCallback((taskId: string): UIMessage[] => {
    return subAgentMessages.get(taskId) || [];
  }, [subAgentMessages]);

  /**
   * Process a message-chunk from sub-agent
   * Uses ChunkConverter for streaming message assembly
   */
  const processChunk = useCallback(
    (taskId: string, chunk: unknown) => {
      const result = converterRef.current.processChunk(taskId, chunk);

      if (result.isFinalized && result.message) {
        setSubAgentMessages((prev) => {
          const next = new Map(prev);
          next.set(taskId, [result.message!]);
          return next;
        });
      } else if (result.streamingMessage) {
        setSubAgentMessages((prev) => {
          const next = new Map(prev);
          next.set(taskId, [result.streamingMessage!]);
          return next;
        });
      }

      const state = converterRef.current.getState(taskId);
      if (state && (chunk as Record<string, unknown>).type === "finish") {
        setSubAgentCards((prev) => {
          const next = new Map(prev);
          const card = next.get(taskId);
          if (card) {
            next.set(taskId, {
              ...card,
              status: "completed" as const,
              progress: 100,
            });
          }
          return next;
        });
      }
    },
    [getOrCreateMessages]
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
    []
  );

  /**
   * Reset all messages
   */
  const reset = useCallback(() => {
    setSubAgentMessages(new Map());
    setSubAgentCards(new Map());
    converterRef.current.reset();
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
    converterRef.current.removeTask(taskId);
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
