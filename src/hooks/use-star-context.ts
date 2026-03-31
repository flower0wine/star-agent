/**
 * Star Context Hook
 *
 * 管理 GitHub 用户认证和 Star 仓库状态
 * 基于 useGitHubAuth 实现，提供向后兼容的 API
 */

"use client";

import type { GitHubRepo } from "@/lib/github/api";

import { useGitHubAuth } from "./use-github-auth";

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
  /** Whether local session is being restored */
  isRestoring: boolean;
  /** Error message */
  error: string | null;
  /** Submit username and fetch repos */
  login: (username: string) => Promise<void>;
  /** Clear session and logout */
  logout: () => void;
  /** Get context object for API calls */
  getContext: () => StarContext;
  /** 刷新 Star 仓库（新增） */
  refreshStars: () => Promise<void>;
  /** 是否正在刷新（新增） */
  isRefreshing: boolean;
  /** 上次获取时间（新增） */
  lastFetchedAt: number | null;
  /** 缓存是否过期（新增） */
  isCacheStale: boolean;
}

/**
 * Hook for managing Star Agent authentication context
 */
export function useStarContext(): UseStarContextReturn {
  const {
    username,
    repos,
    isVerified,
    isLoading,
    isRestoring,
    isRefreshing,
    error,
    lastFetchedAt,
    isCacheStale,
    login,
    logout,
    refreshStars,
    getContext,
  } = useGitHubAuth();

  return {
    username,
    repos,
    isVerified,
    isLoading,
    isRestoring,
    isRefreshing,
    error,
    lastFetchedAt,
    isCacheStale,
    login,
    logout,
    refreshStars,
    getContext,
  };
}
