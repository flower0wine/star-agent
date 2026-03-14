"use client";

import { useCallback, useState } from "react";
import { starAgentService } from "@/lib/agent/agent-service";
import type { ChatResult } from "@/lib/agent/agent-service";
import type { ModelId } from "@/lib/services/openrouter";

export interface UseAgentOptions {
  modelId?: ModelId;
}

export interface UseAgentReturn {
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<ChatResult>;
  streamMessage: (
    message: string,
    onChunk: (chunk: string) => void
  ) => Promise<ChatResult>;
  setModel: (modelId: ModelId) => void;
  clearError: () => void;
}

/**
 * Hook for interacting with the Star Agent
 */
export function useAgent(options: UseAgentOptions = {}): UseAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string): Promise<ChatResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await starAgentService.chat(message, {
          modelId: options.modelId,
        });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options.modelId]
  );

  const streamMessage = useCallback(
    async (
      message: string,
      onChunk: (chunk: string) => void
    ): Promise<ChatResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await starAgentService.streamChat(message, {
          modelId: options.modelId,
          onChunk,
          onComplete: () => {
            setIsLoading(false);
          },
          onError: (err) => {
            setError(err.message);
            setIsLoading(false);
          },
        });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [options.modelId]
  );

  const setModel = useCallback((modelId: ModelId) => {
    starAgentService.setModel(modelId);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    sendMessage,
    streamMessage,
    setModel,
    clearError,
  };
}
