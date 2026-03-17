/**
 * Agent Chat Hook
 *
 * Generic hook for chatting with any agent.
 * Extends the Vercel AI SDK useChat with agent-specific configuration.
 */

"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, LanguageModelUsage } from "ai";
import { DefaultChatTransport } from "ai";

/**
 * Chat message type with usage metadata
 */
export interface AgentChatMessage extends UIMessage<{ totalUsage: LanguageModelUsage }> {}

/**
 * Hook options
 */
interface UseAgentChatOptions {
  /** API endpoint */
  api?: string;
  /** Agent ID to use */
  agentId?: string;
  /** Additional context to pass to the agent */
  context?: Record<string, unknown>;
}

/**
 * Generic agent chat hook
 * @param {UseAgentChatOptions} options - Configuration options
 * @returns {{
 *   messages: import("ai").UIMessage[];
 *   input: string;
 *   setInput: (input: string) => void;
 *   sendMessage: (message: { text: string }) => Promise<void>;
 *   status: import("@ai-sdk/react").UseChatStatus;
 *   error: Error | null;
 *   reload: () => Promise<void>;
 *   stop: () => void;
 * }} Chat methods and state
 */
export function useAgentChat({
  api = "/api/chat",
  agentId = "star",
  context = {},
}: UseAgentChatOptions = {}) {
  const contextRef = useRef(context);

  // Always keep context ref updated
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const chat = useChat<AgentChatMessage>({
    id: `chat-${agentId}`,
    transport: new DefaultChatTransport({
      api,
      credentials: "same-origin",
    }),
  });

  /**
   * Send a message to the agent
   */
  const sendMessage = async (message: { text: string }) => {
    await chat.sendMessage(message, {
      body: {
        agentId,
        context: contextRef.current,
      },
    });
  };

  return {
    ...chat,
    sendMessage,
  };
}
