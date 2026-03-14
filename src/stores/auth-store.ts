import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GitHubUser } from "@/types/github";

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  TOKEN: "github_access_token",
  USER: "github_user",
} as const;

// =============================================================================
// Store State
// =============================================================================

export interface AuthStore {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GitHubUser | null;
  token: string | null;
  error: string | null;

  // Actions
  setUser: (user: GitHubUser) => void;
  setToken: (token: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  token: null,
  error: null,
};

// =============================================================================
// Store Factory
// =============================================================================

export function createAuthStore() {
  return create<AuthStore>()(
    persist(
      (set) => ({
        ...initialState,

        setUser: (user: GitHubUser) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
          }
          set({ user, isAuthenticated: true, error: null });
        },

        setToken: (token: string) => {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.TOKEN, token);
          }
          set({ token, isAuthenticated: true });
        },

        setLoading: (loading: boolean) => set({ isLoading: loading }),

        setError: (error: string | null) => set({ error, isLoading: false }),

        logout: () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
          }
          set({ ...initialState });
        },

        reset: () => set(initialState),
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    )
  );
}

// =============================================================================
// Singleton Store (for use across components)
// =============================================================================

export const authStore = createAuthStore();

// =============================================================================
// Selector Hooks (for optimized re-renders)
// =============================================================================

export const useAuthStore = authStore;

export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectIsLoading = (state: AuthStore) => state.isLoading;
export const selectUser = (state: AuthStore) => state.user;
export const selectToken = (state: AuthStore) => state.token;
export const selectError = (state: AuthStore) => state.error;
