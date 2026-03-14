// =============================================================================
// Conversation Store (Zustand)
// Manages conversation state with persistence
// =============================================================================

"use client";

import { create } from "zustand";
import type { Conversation, ConversationSummary, Message } from "@/types/storage";
import { conversationStorage } from "@/lib/storage/conversation-storage";

interface ConversationStore {
  // State
  conversations: ConversationSummary[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  isHydrated: boolean;

  // Actions
  hydrate: () => Promise<void>;
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  addMessage: (message: Message) => Promise<void>;
  updateLatestMessage: (content: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  clearCurrentConversation: () => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isHydrated: false,

  // Hydrate from storage
  hydrate: async () => {
    set({ isLoading: true });
    try {
      const conversations = await conversationStorage.getAll();
      set({
        conversations,
        isHydrated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to hydrate conversations:", error);
      set({ isHydrated: true, isLoading: false });
    }
  },

  // Load all conversations
  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const conversations = await conversationStorage.getAll();
      set({ conversations, isLoading: false });
    } catch (error) {
      console.error("Failed to load conversations:", error);
      set({ isLoading: false });
    }
  },

  // Create new conversation
  createConversation: async (title = "New Chat") => {
    set({ isLoading: true });
    try {
      const conversation = await conversationStorage.create(title);
      const conversations = await conversationStorage.getAll();
      set({
        currentConversation: conversation,
        conversations,
        isLoading: false,
      });
      return conversation;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Select conversation by ID
  selectConversation: async (id: string) => {
    set({ isLoading: true });
    try {
      const conversation = await conversationStorage.get(id);
      set({ currentConversation: conversation, isLoading: false });
    } catch (error) {
      console.error("Failed to select conversation:", error);
      set({ isLoading: false });
    }
  },

  // Add message to current conversation
  addMessage: async (message: Message) => {
    const { currentConversation } = get();
    if (!currentConversation) {
      console.warn("No current conversation to add message to");
      return;
    }

    try {
      const updated = await conversationStorage.addMessage(currentConversation.id, message);
      if (updated) {
        set({ currentConversation: updated });
        // Refresh conversation list
        const conversations = await conversationStorage.getAll();
        set({ conversations });
      }
    } catch (error) {
      console.error("Failed to add message:", error);
    }
  },

  // Update the latest assistant message in current conversation
  updateLatestMessage: async (content: string) => {
    const { currentConversation } = get();
    if (!currentConversation || currentConversation.messages.length === 0) {
      return;
    }

    try {
      // Find the last assistant message
      const messages = [...currentConversation.messages];
      const lastIndex = messages.length - 1;

      // Only update if the last message is from assistant
      if (messages[lastIndex].role !== "assistant") {
        return;
      }

      // Update the content
      const updatedMessage = {
        ...messages[lastIndex],
        content,
        timestamp: Date.now(),
      };
      messages[lastIndex] = updatedMessage;

      const updatedConversation = {
        ...currentConversation,
        messages,
        updatedAt: Date.now(),
      };

      await conversationStorage.save(updatedConversation);
      set({ currentConversation: updatedConversation });
    } catch (error) {
      console.error("Failed to update latest message:", error);
    }
  },

  // Update conversation title
  updateTitle: async (id: string, title: string) => {
    try {
      await conversationStorage.updateTitle(id, title);
      const conversations = await conversationStorage.getAll();
      set({ conversations });

      // Update current conversation if it's the one being updated
      const { currentConversation } = get();
      if (currentConversation?.id === id) {
        const updated = await conversationStorage.get(id);
        set({ currentConversation: updated });
      }
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  },

  // Delete conversation
  deleteConversation: async (id: string) => {
    try {
      await conversationStorage.delete(id);
      const conversations = await conversationStorage.getAll();

      // Clear current if deleted
      const { currentConversation } = get();
      const newCurrent = currentConversation?.id === id ? null : currentConversation;

      set({ conversations, currentConversation: newCurrent });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  },

  // Clear current conversation
  clearCurrentConversation: () => {
    set({ currentConversation: null });
  },
}));
