"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  authStore,
  selectError,
  selectIsAuthenticated,
  selectIsLoading,
  selectUser,
  selectToken,
} from "@/stores/auth-store";
import githubAuthService, { login as serviceLogin, logout as serviceLogout } from "@/lib/services/github-auth";
import type { GitHubUser, AuthError } from "@/types/github";

// =============================================================================
// Hook Interface
// =============================================================================

export interface UseGitHubAuth {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GitHubUser | null;
  token: string | null;
  error: string | null;

  // Actions
  login: () => void;
  logout: () => void;
  handleCallback: (code: string, state: string) => Promise<{ success: boolean; error?: AuthError }>;
  refreshUser: () => Promise<GitHubUser | null>;
  clearError: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useGitHubAuth(): UseGitHubAuth {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get state from store
  const isAuthenticated = authStore(selectIsAuthenticated);
  const isLoading = authStore(selectIsLoading);
  const user = authStore(selectUser);
  const token = authStore(selectToken);
  const error = authStore(selectError);

  // Local state for callback handling
  const [isInitialized, setIsInitialized] = useState(false);

  // =============================================================================
  // Effects
  // =============================================================================

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = githubAuthService.getToken();
      const storedUser = githubAuthService.getCachedUser();

      if (storedToken && storedUser) {
        // Hydrate store with stored data
        authStore.getState().setToken(storedToken);
        authStore.getState().setUser(storedUser);

        // Optionally refresh user data
        try {
          const freshUser = await githubAuthService.getCurrentUser();
          if (freshUser) {
            authStore.getState().setUser(freshUser);
          }
        } catch {
          // Use cached user if refresh fails
        }
      }

      setIsInitialized(true);
    };

    initAuth();
  }, []);

  // Handle OAuth callback from URL
  useEffect(() => {
    if (!isInitialized)
      return;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (code && state) {
      // Clear URL params
      router.replace("/", { scroll: false });

      // Handle callback
      const handleCallback = async () => {
        authStore.getState().setLoading(true);

        const result = await githubAuthService.handleCallback(code, state);

        if (result.success) {
          // Get stored user and update store
          const storedUser = githubAuthService.getCachedUser();
          if (storedUser) {
            authStore.getState().setUser(storedUser);
          }
          // Fetch fresh user data
          const freshUser = await githubAuthService.getCurrentUser();
          if (freshUser) {
            authStore.getState().setUser(freshUser);
          }
          authStore.getState().setLoading(false);
        } else {
          authStore.getState().setError(result.error?.message || "Authentication failed");
        }
      };

      handleCallback();
    }

    // Handle OAuth errors from URL
    const authError = searchParams.get("auth_error");
    if (authError && isInitialized) {
      router.replace("/", { scroll: false });
      const errorDescription = searchParams.get("error_description");
      authStore.getState().setError(errorDescription || "Authentication was cancelled");
    }
  }, [isInitialized, searchParams, router]);

  // =============================================================================
  // Actions
  // =============================================================================

  const login = useCallback(() => {
    authStore.getState().setLoading(true);
    authStore.getState().setError(null);
    serviceLogin();
  }, []);

  const logout = useCallback(() => {
    authStore.getState().logout();
    serviceLogout();
  }, []);

  const handleCallback = useCallback(
    async (code: string, state: string) => {
      authStore.getState().setLoading(true);
      const result = await githubAuthService.handleCallback(code, state);

      if (result.success) {
        const storedUser = githubAuthService.getCachedUser();
        if (storedUser) {
          authStore.getState().setUser(storedUser);
        }
        const freshUser = await githubAuthService.getCurrentUser();
        if (freshUser) {
          authStore.getState().setUser(freshUser);
        }
      } else {
        authStore.getState().setError(result.error?.message || "Authentication failed");
      }

      return result;
    },
    []
  );

  const refreshUser = useCallback(async () => {
    const freshUser = await githubAuthService.getCurrentUser();
    if (freshUser) {
      authStore.getState().setUser(freshUser);
    }
    return freshUser;
  }, []);

  const clearError = useCallback(() => {
    authStore.getState().setError(null);
  }, []);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    error,
    login,
    logout,
    handleCallback,
    refreshUser,
    clearError,
  };
}

// =============================================================================
// Default Export
// =============================================================================

export default useGitHubAuth;
