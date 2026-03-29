/**
 * GitHub Authentication Hook
 *
 * 管理 GitHub 用户认证状态，集成缓存层
 * 支持登录、登出、刷新 Star 仓库等操作
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import type { GitHubRepo } from "@/lib/github/api";
import {
  clearUserCache,
  fetchStarsWithCache,
  fetchUserInfo,
  refreshStarsCache,
} from "@/lib/github/service";
import type { GitHubUserInfo } from "@/lib/github/service";
import { getStarsCacheInfo } from "@/lib/storage";

// ============================================================================
// Types
// ============================================================================

export interface UseGitHubAuthReturn {
  /** 用户名 */
  username: string;
  /** 用户信息 */
  user: GitHubUserInfo | null;
  /** Star 仓库列表 */
  repos: GitHubRepo[];
  /** 是否已验证（登录） */
  isVerified: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在刷新 */
  isRefreshing: boolean;
  /** 错误信息 */
  error: string | null;
  /** 上次获取时间 */
  lastFetchedAt: number | null;
  /** 缓存是否过期 */
  isCacheStale: boolean;
  /** 登录 */
  login: (username: string) => Promise<void>;
  /** 登出 */
  logout: () => void;
  /** 刷新 Star 仓库 */
  refreshStars: () => Promise<void>;
  /** 获取上下文（用于 API 调用） */
  getContext: () => { username: string; repos: GitHubRepo[] };
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  username: "github_username",
  user: "github_user",
} as const;

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGitHubAuth(): UseGitHubAuthReturn {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState<GitHubUserInfo | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [isCacheStale, setIsCacheStale] = useState(false);

  // 防止重复初始化
  const isInitializedRef = useRef(false);

  // 从 localStorage 恢复会话
  useEffect(() => {
    if (isInitializedRef.current)
      return;
    isInitializedRef.current = true;

    const restoreSession = async () => {
      const savedUsername = localStorage.getItem(STORAGE_KEYS.username);
      const savedUser = localStorage.getItem(STORAGE_KEYS.user);

      if (!savedUsername)
        return;

      try {
        // 恢复用户信息
        if (savedUser) {
          setUser(JSON.parse(savedUser) as GitHubUserInfo);
        }
        setUsername(savedUsername);

        // 检查缓存状态
        const cacheInfo = await getStarsCacheInfo(savedUsername);
        if (cacheInfo?.exists) {
          setIsCacheStale(cacheInfo.isExpired);
          setLastFetchedAt(cacheInfo.fetchedAt);

          // 从缓存加载仓库
          const result = await fetchStarsWithCache(savedUsername);
          setRepos(result.repos);
          setLastFetchedAt(result.fetchedAt);
          setIsVerified(true);
        }
      } catch (err) {
        console.error("Failed to restore session:", err);
        // 清除无效的存储数据
        localStorage.removeItem(STORAGE_KEYS.username);
        localStorage.removeItem(STORAGE_KEYS.user);
      }
    };

    void restoreSession();
  }, []);

  // 登录
  const login = useCallback(async (inputUsername: string) => {
    const trimmedUsername = inputUsername.trim();
    if (!trimmedUsername)
      return;

    setIsLoading(true);
    setError(null);

    try {
      // 获取用户信息
      const userInfo = await fetchUserInfo(trimmedUsername);

      // 获取 Star 仓库（带缓存）
      const result = await fetchStarsWithCache(trimmedUsername);

      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEYS.username, trimmedUsername);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userInfo));

      // 更新状态
      setUsername(trimmedUsername);
      setUser(userInfo);
      setRepos(result.repos);
      setLastFetchedAt(result.fetchedAt);
      setIsCacheStale(false);
      setIsVerified(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    // 清除 localStorage
    localStorage.removeItem(STORAGE_KEYS.username);
    localStorage.removeItem(STORAGE_KEYS.user);

    // 重置状态
    setUsername("");
    setUser(null);
    setRepos([]);
    setIsVerified(false);
    setError(null);
    setLastFetchedAt(null);
    setIsCacheStale(false);
  }, []);

  // 刷新 Star 仓库
  const refreshStars = useCallback(async () => {
    if (!username || isRefreshing)
      return;

    setIsRefreshing(true);
    setError(null);

    try {
      const result = await refreshStarsCache(username);
      setRepos(result.repos);
      setLastFetchedAt(result.fetchedAt);
      setIsCacheStale(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "刷新失败";
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [username, isRefreshing]);

  // 获取上下文
  const getContext = useCallback(() => ({
    username,
    repos,
  }), [username, repos]);

  return {
    username,
    user,
    repos,
    isVerified,
    isLoading,
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
