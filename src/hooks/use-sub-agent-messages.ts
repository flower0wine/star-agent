/**
 * Sub-Agent Messages Hook
 *
 * Handles accumulation of UIMessageChunks into complete UIMessages
 * for rendering in the sub-agent panel.
 *
 * Uses ChunkConverter for streaming message assembly.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { UIMessage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { ChunkConverter } from "@/lib/agents/chunk-converter";

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
    _progress?: number,
    result?: string,
    error?: string
  ) => void;
  /** Upsert sub-agent card metadata */
  upsertSubAgentCard: (taskId: string, patch: Partial<SubAgentCard>) => void;
  /** Hydrate cards/messages from persisted history */
  hydrateFromHistory: (payload: {
    cards: Map<string, SubAgentCard>;
    messages: Map<string, UIMessage[]>;
  }) => void;
  /** Reset all messages */
  reset: () => void;
  /** Remove a specific sub-agent */
  removeSubAgent: (taskId: string) => void;
}

/**
 * Sub-agent messages hook
 */
export function useSubAgentMessages(): UseSubAgentMessagesReturn {
  const [subAgentMessages, setSubAgentMessages] = useState<Map<string, UIMessage[]>>(
    new Map()
  );

  const [subAgentCards, setSubAgentCards] = useState<Map<string, SubAgentCard>>(
    new Map()
  );

  const converterRef = useRef<ChunkConverter>(new ChunkConverter());

  // ===== 性能优化: 批量累积 + requestAnimationFrame =====
  // 累积待处理的原始 chunks (延迟处理，避免主线程阻塞)
  const pendingChunksRef = useRef<Array<{ taskId: string; chunk: unknown }>>([]);
  // 累积待更新的消息状态
  const pendingMessagesRef = useRef<Map<string, UIMessage[]>>(new Map());
  // 累积待更新的卡片状态
  const pendingCardsRef = useRef<Map<string, Partial<SubAgentCard>>>(new Map());
  // RAF handle
  const rafRef = useRef<number | null>(null);
  // 标记是否有待处理更新
  const hasPendingRef = useRef(false);

  // 清理 RAF
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  /**
   * 批量处理累积的 chunks 并刷新状态 (RAF 核心)
   * 使用 requestAnimationFrame 确保在浏览器空闲时处理
   */
  const flushPendingUpdates = useCallback(() => {
    rafRef.current = null;
    hasPendingRef.current = false;

    // 1. 批量处理累积的 chunks
    const chunks = pendingChunksRef.current;
    if (chunks.length > 0) {
      pendingChunksRef.current = [];
      for (const { taskId, chunk } of chunks) {
        const result = converterRef.current.processChunk(taskId, chunk);
        if (result.isFinalized && result.message) {
          pendingMessagesRef.current.set(taskId, [result.message]);
        } else if (result.streamingMessage) {
          pendingMessagesRef.current.set(taskId, [result.streamingMessage]);
        }
        // 检查完成状态
        if ((chunk as Record<string, unknown>).type === "finish") {
          pendingCardsRef.current.set(taskId, {
            status: "completed" as const,
          });
        }
      }
    }

    // 2. 批量刷新消息状态 (先复制再清理，避免 React 并发模式问题)
    if (pendingMessagesRef.current.size > 0) {
      const messagesToFlush = new Map(pendingMessagesRef.current);
      pendingMessagesRef.current.clear();
      setSubAgentMessages((prev) => {
        const next = new Map(prev);
        messagesToFlush.forEach((msgs, taskId) => {
          next.set(taskId, msgs);
        });
        return next;
      });
    }

    // 3. 批量刷新卡片状态 (先复制再清理，避免 React 并发模式问题)
    if (pendingCardsRef.current.size > 0) {
      const cardsToFlush = new Map(pendingCardsRef.current);
      pendingCardsRef.current.clear();
      setSubAgentCards((prev) => {
        const next = new Map(prev);
        cardsToFlush.forEach((update, taskId) => {
          const existing = next.get(taskId);
          if (existing) {
            next.set(taskId, { ...existing, ...update });
          }
        });
        return next;
      });
    }
  }, []);

  /**
   * 调度 RAF 更新 (每帧最多执行一次)
   */
  const scheduleUpdate = useCallback(() => {
    if (!hasPendingRef.current) {
      hasPendingRef.current = true;
      rafRef.current = requestAnimationFrame(flushPendingUpdates);
    }
  }, [flushPendingUpdates]);

  /**
   * Process a message-chunk from sub-agent
   * 优化: 延迟处理 chunk，仅累积原始数据，在 RAF 中批量处理
   * 这样即使有多个 sub-agent 并发，也不会阻塞主线程
   */
  const processChunk = useCallback(
    (taskId: string, chunk: unknown) => {
      // 只累积原始 chunk，不立即处理
      pendingChunksRef.current.push({ taskId, chunk });
      // 调度 RAF 更新
      scheduleUpdate();
    },
    [scheduleUpdate]
  );

  /**
   * Handle progress/complete/error events
   * 优化: 使用批量更新，"start" 事件立即处理（创建卡片），其他事件延迟批量处理
   */
  const handleProgress = useCallback(
    (
      taskId: string,
      progressType: string,
      _progress?: number,
      result?: string,
      error?: string
    ) => {
      // "start" 事件需要立即处理，否则 UI 不会显示新卡片
      if (progressType === "start") {
        setSubAgentCards((prev) => {
          const next = new Map(prev);
          const existing = next.get(taskId);
          next.set(taskId, {
            taskId,
            status: "running",
            task: existing?.task,
            currentOutput: existing?.currentOutput || "",
            finalResult: undefined,
            error: undefined,
          });
          return next;
        });
        return;
      }

      // 其他事件延迟批量处理
      if (progressType === "complete") {
        pendingCardsRef.current.set(taskId, {
          status: "completed",
          finalResult: result,
        });
      } else if (progressType === "error") {
        pendingCardsRef.current.set(taskId, {
          status: "failed",
          error,
        });
      }

      scheduleUpdate();
    },
    [scheduleUpdate]
  );

  /**
   * Upsert sub-agent card metadata
   */
  const upsertSubAgentCard = useCallback((taskId: string, patch: Partial<SubAgentCard>) => {
    setSubAgentCards((prev) => {
      const existing = prev.get(taskId);
      const nextCard: SubAgentCard = {
        taskId,
        status: existing?.status || "pending",
        task: existing?.task,
        currentOutput: existing?.currentOutput || "",
        finalResult: existing?.finalResult,
        error: existing?.error,
        ...patch,
      };

      if (
        existing
        && existing.status === nextCard.status
        && existing.task === nextCard.task
        && existing.currentOutput === nextCard.currentOutput
        && existing.finalResult === nextCard.finalResult
        && existing.error === nextCard.error
      ) {
        return prev;
      }

      const next = new Map(prev);
      next.set(taskId, nextCard);
      return next;
    });
  }, []);

  const hydrateFromHistory = useCallback((payload: {
    cards: Map<string, SubAgentCard>;
    messages: Map<string, UIMessage[]>;
  }) => {
    const { cards, messages } = payload;
    setSubAgentCards(cards);
    setSubAgentMessages(messages);
  }, []);

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
    upsertSubAgentCard,
    hydrateFromHistory,
    reset,
    removeSubAgent,
  };
}
