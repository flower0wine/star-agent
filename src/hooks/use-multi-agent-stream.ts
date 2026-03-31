/**
 * Multi-Agent Stream Hook
 *
 * Custom hook for handling multi-stream SSE messages.
 * Parses SSE data and updates sub-agent card states.
 */

"use client";

import { useState, useCallback } from "react";
import type { SubAgentCard, SSEMessage } from "@/types/agent";

/**
 * Hook options
 */
interface UseMultiAgentStreamOptions {
  /** Callback when a new SSE message is received */
  onMessage?: (message: SSEMessage) => void;
  /** Callback when sub-agent status changes */
  onSubAgentUpdate?: (cards: Map<string, SubAgentCard>) => void;
}

/**
 * Multi-agent stream hook
 *
 * This hook provides utilities for parsing SSE messages from the multi-stream API.
 * It maintains a Map of sub-agent cards that get updated as progress events arrive.
 */
export function useMultiAgentStream(options: UseMultiAgentStreamOptions = {}) {
  const { onMessage, onSubAgentUpdate } = options;

  /** Sub-agent cards state */
  const [subAgentCards, setSubAgentCards] = useState<Map<string, SubAgentCard>>(
    new Map()
  );

  /** Parse SSE data string to SSEMessage */
  const parseSSE = useCallback((data: string): SSEMessage | null => {
    try {
      return JSON.parse(data) as SSEMessage;
    } catch {
      console.error("Failed to parse SSE data:", data);
      return null;
    }
  }, []);

  /** Handle incoming SSE message */
  const handleSSEMessage = useCallback(
    (message: SSEMessage) => {
      // Call the optional onMessage callback
      onMessage?.(message);

      const { streamId, type, content, result, error } = message;

      // Skip non-subagent messages
      if (!streamId || !streamId.startsWith("subagent-")) {
        return;
      }

      setSubAgentCards((prev) => {
        const current = prev.get(streamId);

        // Create or update card
        const card: SubAgentCard = current
          ? {
              ...current,
              status:
                type === "complete"
                  ? "completed"
                  : type === "error"
                    ? "failed"
                    : type === "start" || type === "progress" || type === "text"
                      ? "running"
                      : current.status,
              currentOutput: content
                ? (current.currentOutput || "") + content
                : current.currentOutput,
              finalResult: result ?? current.finalResult,
              error: error ?? current.error,
            }
          : {
              taskId: streamId,
              status:
                type === "complete"
                  ? "completed"
                  : type === "error"
                    ? "failed"
                    : "pending",
              currentOutput: content,
              finalResult: result,
              error,
            };

        const next = new Map(prev);
        next.set(streamId, card);

        // Notify updates
        onSubAgentUpdate?.(next);

        return next;
      });
    },
    [onMessage, onSubAgentUpdate]
  );

  /** Reset all sub-agent cards */
  const reset = useCallback(() => {
    setSubAgentCards(new Map());
  }, []);

  /** Remove a specific sub-agent card */
  const removeCard = useCallback((taskId: string) => {
    setSubAgentCards((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      onSubAgentUpdate?.(next);
      return next;
    });
  }, [onSubAgentUpdate]);

  /** Update card manually (e.g., from tool call response) */
  const updateCard = useCallback(
    (taskId: string, updates: Partial<SubAgentCard>) => {
      setSubAgentCards((prev) => {
        const current = prev.get(taskId);
        if (!current)
          return prev;

        const next = new Map(prev);
        next.set(taskId, { ...current, ...updates });
        onSubAgentUpdate?.(next);
        return next;
      });
    },
    [onSubAgentUpdate]
  );

  return {
    /** Current sub-agent cards */
    subAgentCards,
    /** Parse SSE data string */
    parseSSE,
    /** Handle incoming SSE message */
    handleSSEMessage,
    /** Reset all cards */
    reset,
    /** Remove a specific card */
    removeCard,
    /** Update a card manually */
    updateCard,
  };
}
