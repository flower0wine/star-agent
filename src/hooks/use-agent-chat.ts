/**
 * Agent Chat Hook
 *
 * Generic hook for chatting with any agent.
 * Extends the Vercel AI SDK useChat with agent-specific configuration.
 * 支持消息持久化到 IndexedDB
 */

"use client";

import { useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, LanguageModelUsage } from "ai";
import { DefaultChatTransport } from "ai";

import { useConversationPersistence } from "./use-conversation-persistence";

/**
 * Chat message type with usage metadata
 */
export interface AgentChatMessage extends UIMessage<{ totalUsage: LanguageModelUsage }> {}

export interface ChatModelConfig {
  providerId: string;
  modelId: string;
  apiKey?: string;
}

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
  /** 当前模型配置 */
  modelConfig?: ChatModelConfig;
  /** Callback for custom data parts (e.g., sub-agent progress) */
  onData?: (data: any) => void;
  /** 当前对话 ID（用于持久化） */
  conversationId?: string | null;
  /** 用户名（用于创建新对话） */
  username?: string | null;
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
  modelConfig,
  onData,
  conversationId = null,
  username = null,
}: UseAgentChatOptions = {}) {
  const contextRef = useRef(context);
  const modelConfigRef = useRef(modelConfig);

  // Always keep context ref updated
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    modelConfigRef.current = modelConfig;
  }, [modelConfig]);

  const chat = useChat<AgentChatMessage>({
    id: `chat-${agentId}-${conversationId || "new"}`,
    transport: new DefaultChatTransport({
      api,
      credentials: "same-origin",
    }),
    onData,
  });

  // 消息持久化
  const { isLoadingMessages, activeConversationId, ensureConversation } = useConversationPersistence({
    conversationId,
    messages: chat.messages,
    setMessages: chat.setMessages,
    status: chat.status,
    agentId,
    username,
  });

  /**
   * Send a message to the agent
   * 发送消息前确保有活动对话
   */
  const sendMessage = useCallback(async (message: { text: string }) => {
    // 确保有对话 ID
    await ensureConversation();

    await chat.sendMessage(message, {
      body: {
        agentId,
        context: contextRef.current,
        modelConfig: modelConfigRef.current,
      },
    });
  }, [chat, agentId, ensureConversation]);

  return {
    ...chat,
    sendMessage,
    isLoadingMessages,
    activeConversationId,
  };
}
