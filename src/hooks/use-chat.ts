"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useConversationStore } from "@/stores/conversation-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Message } from "@/types/storage";
import { nanoid } from "nanoid";

export interface UseChatOptions {
  conversationId?: string;
}

export interface UseChatReturn {
  // State
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  currentConversationId: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => Promise<void>;
  stopGeneration: () => void;
  loadConversation: (id: string) => Promise<void>;
  createNewChat: () => Promise<string>;
}

/**
 * Hook for managing chat functionality
 * Uses Vercel AI SDK with server-side Mastra agent
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [error, setError] = useState<string | null>(null);

  // Refs for streaming control
  const streamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Get data from stores
  const currentConversation = useConversationStore(
    (state) => state.currentConversation
  );
  const currentConversationId = currentConversation?.id ?? null;
  const storeMessages = currentConversation?.messages ?? [];

  // Get settings
  const model = useSettingsStore((state) => state.model);

  // Actions from store
  const createConversation = useConversationStore(
    (state) => state.createConversation
  );
  const selectConversation = useConversationStore(
    (state) => state.selectConversation
  );
  const addMessage = useConversationStore((state) => state.addMessage);
  const updateLatestMessage = useConversationStore(
    (state) => state.updateLatestMessage
  );
  const deleteConversation = useConversationStore(
    (state) => state.deleteConversation
  );

  // AI SDK useChat hook - connects to server-side API route
  const aiChat = useAiChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const { messages: aiMessages, sendMessage: aiSendMessage, status, stop } = aiChat;

  const isLoading = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  // Convert AI SDK messages to our format and sync to store
  const messages: Message[] = storeMessages.length > 0 ? storeMessages : [];

  // Load conversation on mount if provided
  useEffect(() => {
    if (options.conversationId) {
      selectConversation(options.conversationId);
    }
  }, [options.conversationId, selectConversation]);

  // Handle AI response - sync to conversation store
  useEffect(() => {
    if (aiMessages.length > 0 && currentConversationId) {
      // Find the latest assistant message from AI SDK
      const latestAiAssistant = aiMessages.toReversed().find(
        (m) => m.role === "assistant"
      );

      if (latestAiAssistant) {
        // Extract text content from parts
        const textContent
          = latestAiAssistant.parts
            ?.filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("") || "";

        if (textContent && storeMessages.length > 0) {
          // Update the latest assistant message in store
          updateLatestMessage(textContent);
        }
      }
    }
  }, [aiMessages, currentConversationId, storeMessages.length, updateLatestMessage]);

  // Send message to agent and add to conversation
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim())
        return;

      // Create new conversation if needed
      let conversationId = currentConversationId;
      if (!conversationId) {
        const newConversation = await createConversation();
        conversationId = newConversation.id;
      }

      // Add user message to store
      const userMessage: Message = {
        id: nanoid(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };
      await addMessage(userMessage);

      // Add placeholder for assistant message
      const assistantMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      await addMessage(assistantMessage);

      // Clear previous error
      setError(null);
      streamingRef.current = true;

      try {
        // Send to AI SDK which calls our API route
        await aiSendMessage({ text: content });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        streamingRef.current = false;
      }
    },
    [currentConversationId, createConversation, addMessage, aiSendMessage]
  );

  // Stop generation
  const stopGeneration = useCallback(() => {
    streamingRef.current = false;
    stop();
  }, [stop]);

  // Clear chat
  const clearChat = useCallback(async () => {
    if (currentConversationId) {
      await deleteConversation(currentConversationId);
    }
  }, [currentConversationId, deleteConversation]);

  // Load conversation
  const loadConversation = useCallback(
    async (id: string) => {
      await selectConversation(id);
    },
    [selectConversation]
  );

  // Create new chat
  const createNewChat = useCallback(async () => {
    const conversation = await createConversation();
    return conversation.id;
  }, [createConversation]);

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    currentConversationId,
    sendMessage,
    clearChat,
    stopGeneration,
    loadConversation,
    createNewChat,
  };
}
