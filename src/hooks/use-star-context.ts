/**
 * Star Context Hook
 *
 * Manages GitHub user authentication and starred repositories state.
 * Handles localStorage persistence for user session.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { GitHubRepo } from "@/lib/github/api";

export interface StarContext {
  username: string;
  repos: GitHubRepo[];
}

export interface UseStarContextReturn {
  /** Current username */
  username: string;
  /** Starred repositories */
  repos: GitHubRepo[];
  /** Whether user is verified (has valid session) */
  isVerified: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Submit username and fetch repos */
  login: (username: string) => Promise<void>;
  /** Clear session and logout */
  logout: () => void;
  /** Get context object for API calls */
  getContext: () => StarContext;
}

const STORAGE_KEYS = {
  username: "star_username",
  repos: "star_repos",
} as const;

/**
 * Hook for managing Star Agent authentication context
 */
export function useStarContext(): UseStarContextReturn {
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem(STORAGE_KEYS.username);
    const savedRepos = localStorage.getItem(STORAGE_KEYS.repos);

    if (savedUsername && savedRepos) {
      try {
        const parsedRepos = JSON.parse(savedRepos) as GitHubRepo[];
        setUsername(savedUsername);
        setRepos(parsedRepos);
        setIsVerified(true);
      } catch {
        // Invalid stored data, clear it
        localStorage.removeItem(STORAGE_KEYS.username);
        localStorage.removeItem(STORAGE_KEYS.repos);
      }
    }
  }, []);

  // Login with username
  const login = useCallback(async (inputUsername: string) => {
    const trimmedUsername = inputUsername.trim();
    if (!trimmedUsername)
      return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/github/stars/${trimmedUsername}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "获取仓库失败");
      }

      const data = await response.json();
      const fetchedRepos = data.repos as GitHubRepo[];

      // Persist to localStorage
      localStorage.setItem(STORAGE_KEYS.username, trimmedUsername);
      localStorage.setItem(STORAGE_KEYS.repos, JSON.stringify(fetchedRepos));

      // Update state
      setUsername(trimmedUsername);
      setRepos(fetchedRepos);
      setIsVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout and clear session
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.username);
    localStorage.removeItem(STORAGE_KEYS.repos);
    setUsername("");
    setRepos([]);
    setIsVerified(false);
    setError(null);
  }, []);

  // Get context for API calls
  const getContext = useCallback((): StarContext => ({
    username,
    repos,
  }), [username, repos]);

  return {
    username,
    repos,
    isVerified,
    isLoading,
    error,
    login,
    logout,
    getContext,
  };
}
