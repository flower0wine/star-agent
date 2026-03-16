import { create } from "zustand";
import type { UIMessage } from "ai";

export type ChatStatus = "idle" | "loading" | "streaming" | "error";

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface StarStore {
  // GitHub username
  username: string | null;
  setUsername: (username: string) => void;

  // User info
  user: GitHubUser | null;
  setUser: (user: GitHubUser | null) => void;

  // Repositories
  reposCount: number;
  setReposCount: (count: number) => void;

  // Chat messages
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  addMessage: (message: UIMessage) => void;
  updateLastMessage: (message: UIMessage) => void;

  // Chat status
  status: ChatStatus;
  setStatus: (status: ChatStatus) => void;

  // Error
  error: string | null;
  setError: (error: string | null) => void;

  // Model configuration
  model: string;
  setModel: (model: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  username: null,
  user: null,
  reposCount: 0,
  messages: [],
  status: "idle" as ChatStatus,
  error: null,
  model: "gpt-4o-mini",
};

export const useStarStore = create<StarStore>((set) => ({
  ...initialState,

  setUsername: (username) => set({ username }),

  setUser: (user) => set({ user }),

  setReposCount: (reposCount) => set({ reposCount }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateLastMessage: (message) =>
    set((state) => ({
      messages: state.messages.map((msg, idx) =>
        idx === state.messages.length - 1 ? message : msg
      ),
    })),

  setStatus: (status) => set({ status }),

  setError: (error) => set({ error }),

  setModel: (model) => set({ model }),

  reset: () => set(initialState),
}));
