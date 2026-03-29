import { create } from "zustand";

import type { ChatConversation } from "@/lib/storage";
import {
  createConversation,
  deleteConversation,
  getAllConversations,
  getConversation,
  updateConversation,
} from "@/lib/storage";

interface ChatHistoryState {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

interface ChatHistoryActions {
  initialize: () => Promise<void>;
  loadConversations: () => Promise<void>;
  createNewConversation: (agentId: string, username: string | null) => Promise<ChatConversation>;
  selectConversation: (id: string | null) => void;
  deleteConversationById: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  updateConversationTimestamp: (id: string) => Promise<void>;
}

type ChatHistoryStore = ChatHistoryActions & ChatHistoryState;

export const useChatHistoryStore = create<ChatHistoryStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized)
      return;
    await get().loadConversations();
    set({ isInitialized: true });
  },

  loadConversations: async () => {
    set({ isLoading: true });
    try {
      const conversations = await getAllConversations();
      set({ conversations, isLoading: false });
    } catch (error) {
      console.error("Failed to load conversations:", error);
      set({ isLoading: false });
    }
  },

  createNewConversation: async (agentId: string, username: string | null) => {
    const conversation = await createConversation(agentId, username);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
    }));
    return conversation;
  },

  selectConversation: (id: string | null) => {
    set({ currentConversationId: id });
  },

  deleteConversationById: async (id: string) => {
    await deleteConversation(id);
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id);
      const currentConversationId
        = state.currentConversationId === id ? null : state.currentConversationId;
      return { conversations, currentConversationId };
    });
  },

  renameConversation: async (id: string, title: string) => {
    await updateConversation(id, { title });
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  updateConversationTimestamp: async (id: string) => {
    const now = Date.now();
    await updateConversation(id, { updatedAt: now });

    set((state) => {
      const updatedConversations = state.conversations.map((c) =>
        c.id === id ? { ...c, updatedAt: now } : c
      );
      // Sort by updatedAt descending
      updatedConversations.sort((a, b) => b.updatedAt - a.updatedAt);
      return { conversations: updatedConversations };
    });
  },
}));

// Selector hooks
export function useCurrentConversation(): ChatConversation | undefined {
  const { conversations, currentConversationId } = useChatHistoryStore();
  return conversations.find((c) => c.id === currentConversationId);
}
