// =============================================================================
// Conversations Hook
// Provides access to conversation state and actions
// =============================================================================

"use client";

import { useConversationStore } from "@/stores/conversation-store";
import type { Message } from "@/types/storage";

export function useConversations() {
  const store = useConversationStore();

  const {
    conversations,
    currentConversation,
    isLoading,
    isHydrated,
    hydrate,
    loadConversations,
    createConversation,
    selectConversation,
    addMessage,
    updateTitle,
    deleteConversation,
    clearCurrentConversation,
  } = store;

  // Convenience method to send a user message
  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: Date.now(),
    };

    // Create new conversation if none exists
    let conversationId = currentConversation?.id;
    if (!conversationId) {
      const newConv = await createConversation("New Chat");
      conversationId = newConv.id;
    }

    // Add user message
    await addMessage(userMessage);

    return userMessage;
  };

  // Convenience method to add assistant response
  const addAssistantMessage = async (content: string) => {
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: Date.now(),
    };

    await addMessage(assistantMessage);
    return assistantMessage;
  };

  return {
    // State
    conversations,
    currentConversation,
    isLoading,
    isHydrated,

    // Actions
    hydrate,
    loadConversations,
    createConversation,
    selectConversation,
    addMessage,
    addAssistantMessage,
    sendMessage,
    updateTitle,
    deleteConversation,
    clearCurrentConversation,
  };
}
