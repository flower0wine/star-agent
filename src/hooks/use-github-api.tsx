// =============================================================================
// GitHub API React Hook
// =============================================================================

"use client";

import { githubApi } from "@/lib/services/github-api";
import type {
  CacheStatus,
  GetStarredReposOptions,
  GitHubRepo,
  RateLimitStatus,
  ReadmeResponse,
  RepoDetailsResponse,
  StarredResponse,
} from "@/types/github";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface UseGitHubApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseGitHubApiReturn {
  // Starred repos
  starredRepos: GitHubRepo[];
  starredReposLoading: boolean;
  starredReposError: string | null;
  fetchStarredRepos: (options?: GetStarredReposOptions) => Promise<StarredResponse>;

  // Repo details
  fetchRepoDetails: (owner: string, repo: string) => Promise<RepoDetailsResponse>;

  // README
  fetchReadme: (owner: string, repo: string, branch?: string) => Promise<ReadmeResponse>;

  // Search
  searchRepos: (query: string, limit?: number) => Promise<GitHubRepo[]>;

  // Cache management
  clearCache: () => void;
  getCacheStatus: () => CacheStatus;

  // Rate limit
  getRateLimit: () => Promise<RateLimitStatus>;

  // Token management
  setToken: (token: string) => void;
  clearToken: () => void;
}

type GetStariredReposOptions = GetStarredReposOptions;

export function useGitHubApi(): UseGitHubApiReturn {
  // State for starred repos
  const [starredRepos, setStarredRepos] = useState<GitHubRepo[]>([]);
  const [starredReposLoading, setStarredReposLoading] = useState(false);
  const [starredReposError, setStarredReposError] = useState<string | null>(null);

  // Fetch starred repositories
  const fetchStarredRepos = useCallback(
    async (options?: GetStariredReposOptions): Promise<StarredResponse> => {
      setStarredReposLoading(true);
      setStarredReposError(null);

      try {
        const response = await githubApi.getStarredRepos(options);
        setStarredRepos(response.data);
        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch starred repos";
        setStarredReposError(message);
        throw error;
      } finally {
        setStarredReposLoading(false);
      }
    },
    []
  );

  // Fetch repo details
  const fetchRepoDetails = useCallback(
    async (owner: string, repo: string): Promise<RepoDetailsResponse> => {
      try {
        return await githubApi.getRepoDetails(owner, repo);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch repo details";
        setStarredReposError(message);
        throw error;
      }
    },
    []
  );

  // Fetch README
  const fetchReadme = useCallback(
    async (owner: string, repo: string, branch?: string): Promise<ReadmeResponse> => {
      try {
        return await githubApi.getReadme(owner, repo, branch);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch README";
        setStarredReposError(message);
        throw error;
      }
    },
    []
  );

  // Search repositories
  const searchRepos = useCallback(async (query: string, limit = 10): Promise<GitHubRepo[]> => {
    try {
      return await githubApi.searchRepos(query, limit);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to search repos";
      setStarredReposError(message);
      throw error;
    }
  }, []);

  // Cache management
  const clearCache = useCallback(() => {
    githubApi.clearCache();
    setStarredRepos([]);
  }, []);

  const getCacheStatus = useCallback((): CacheStatus => {
    return githubApi.getCacheStatus();
  }, []);

  // Rate limit
  const getRateLimit = useCallback(async (): Promise<RateLimitStatus> => {
    return await githubApi.getRateLimit();
  }, []);

  // Token management
  const setToken = useCallback((token: string) => {
    githubApi.setToken(token);
  }, []);

  const clearToken = useCallback(() => {
    githubApi.clearToken();
  }, []);

  return {
    // Starred repos
    starredRepos,
    starredReposLoading,
    starredReposError,
    fetchStarredRepos,

    // Repo details
    fetchRepoDetails,

    // README
    fetchReadme,

    // Search
    searchRepos,

    // Cache management
    clearCache,
    getCacheStatus,

    // Rate limit
    getRateLimit,

    // Token management
    setToken,
    clearToken,
  };
}

// =============================================================================
// GitHub API Provider
// =============================================================================

interface GitHubApiContextValue extends UseGitHubApiReturn {
  isReady: boolean;
}

const GitHubApiContext = createContext<GitHubApiContextValue | null>(null);

interface GitHubApiProviderProps {
  children: ReactNode;
  token?: string;
}

export function GitHubApiProvider({ children, token }: GitHubApiProviderProps) {
  const api = useGitHubApi();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (token) {
      api.setToken(token);
      // Auto-fetch starred repos when token is provided
      api.fetchStarredRepos().finally(() => {
        setIsReady(true);
      });
    }
  }, [token]);

  const value: GitHubApiContextValue = {
    ...api,
    isReady,
  };

  return (
    <GitHubApiContext.Provider value={value}>
      {children}
    </GitHubApiContext.Provider>
  );
}

export function useGitHubApiContext() {
  const context = useContext(GitHubApiContext);
  if (!context) {
    throw new Error("useGitHubApiContext must be used within a GitHubApiProvider");
  }
  return context;
}
