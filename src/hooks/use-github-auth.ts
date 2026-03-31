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
  fetchStarsWithCache,
  fetchUserInfo,
  refreshStarsCache,
} from "@/lib/github/service";
import type { GitHubUserInfo } from "@/lib/github/service";
import {
  getOrCreateAgentConfig,
  getStarsCache,
  updateStaticConfig,
} from "@/lib/storage";
import { DEFAULT_STAR_STATIC_CONFIG } from "@/agents/star/static-config";
import type { StarAgentStaticConfig } from "@/agents/star/static-config";

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
  /** 是否正在恢复本地会话 */
  isRestoring: boolean;
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
  // Legacy keys for backward compatibility
  legacyUsername: "star_username",
  legacyRepos: "star_repos",
} as const;

const STAR_AGENT_ID = "star";

async function getFetchConfig(): Promise<StarAgentStaticConfig> {
  const config = await getOrCreateAgentConfig<StarAgentStaticConfig>(
    STAR_AGENT_ID,
    DEFAULT_STAR_STATIC_CONFIG
  );

  return {
    ...DEFAULT_STAR_STATIC_CONFIG,
    ...config.staticConfig,
  };
}

async function saveLastFetchedAt(lastFetchedAt: number): Promise<void> {
  await updateStaticConfig<StarAgentStaticConfig>(
    STAR_AGENT_ID,
    { lastFetchedAt },
    DEFAULT_STAR_STATIC_CONFIG
  );
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGitHubAuth(): UseGitHubAuthReturn {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState<GitHubUserInfo | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
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
      const savedUsername
        = localStorage.getItem(STORAGE_KEYS.username)
          || localStorage.getItem(STORAGE_KEYS.legacyUsername);
      const savedUser = localStorage.getItem(STORAGE_KEYS.user);
      const savedRepos = localStorage.getItem(STORAGE_KEYS.legacyRepos);

      if (!savedUsername) {
        setIsRestoring(false);
        return;
      }

      try {
        const fetchConfig = await getFetchConfig();
        const now = Date.now();
        const isScheduleDue = !fetchConfig.lastFetchedAt
          || now - fetchConfig.lastFetchedAt >= fetchConfig.fetchIntervalMinutes * 60 * 1000;

        // 恢复用户信息
        if (savedUser) {
          setUser(JSON.parse(savedUser) as GitHubUserInfo);
        }

        let hasLocalRepos = false;

        // 兼容旧版 localStorage 中的 star_repos
        if (savedRepos) {
          try {
            const parsedRepos = JSON.parse(savedRepos) as GitHubRepo[];
            if (Array.isArray(parsedRepos)) {
              setRepos(parsedRepos);
              hasLocalRepos = parsedRepos.length > 0;
            }
          } catch {
            // Ignore invalid legacy repos cache
          }
        }

        setUsername(savedUsername);
        setIsVerified(true);

        const starsCache = await getStarsCache(savedUsername);
        if (starsCache) {
          setRepos(starsCache.repos);
          setLastFetchedAt(starsCache.fetchedAt);
          setIsCacheStale(starsCache.isExpired);
          hasLocalRepos = starsCache.repos.length > 0 || hasLocalRepos;
        }

        // 恢复阶段策略：
        // - manual / on-login: 不自动请求 API
        // - scheduled: 仅在开启后台刷新且达到间隔时自动刷新
        const shouldScheduledRefresh
          = fetchConfig.fetchMode === "scheduled"
            && fetchConfig.backgroundRefresh
            && isScheduleDue;

        if (shouldScheduledRefresh) {
          const result = await refreshStarsCache(savedUsername);
          setRepos(result.repos);
          setLastFetchedAt(result.fetchedAt);
          setIsCacheStale(false);
          localStorage.setItem(STORAGE_KEYS.legacyRepos, JSON.stringify(result.repos));
          await saveLastFetchedAt(result.fetchedAt);
        } else if (!hasLocalRepos) {
          // 没有本地数据时兜底拉取一次，防止会话可用但仓库为空
          const result = await fetchStarsWithCache(savedUsername);
          setRepos(result.repos);
          setLastFetchedAt(result.fetchedAt);
          setIsCacheStale(false);
          localStorage.setItem(STORAGE_KEYS.legacyRepos, JSON.stringify(result.repos));
          if (!result.fromCache) {
            await saveLastFetchedAt(result.fetchedAt);
          }
        }
      } catch (err) {
        console.error("Failed to restore session:", err);
        // 保持已恢复的登录态，提示用户可手动刷新
        const message = err instanceof Error ? err.message : "恢复仓库数据失败";
        setError(message);
      } finally {
        setIsRestoring(false);
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
      const fetchConfig = await getFetchConfig();
      const now = Date.now();
      const isScheduleDue = !fetchConfig.lastFetchedAt
        || now - fetchConfig.lastFetchedAt >= fetchConfig.fetchIntervalMinutes * 60 * 1000;

      // 获取用户信息
      const userInfo = await fetchUserInfo(trimmedUsername);

      // 登录阶段策略：
      // - on-login: 每次登录强制刷新
      // - scheduled: 到间隔时刷新，否则使用缓存
      // - manual: 使用缓存（无缓存才请求）
      const result = fetchConfig.fetchMode === "on-login"
        ? await refreshStarsCache(trimmedUsername)
        : (fetchConfig.fetchMode === "scheduled" && isScheduleDue
            ? await refreshStarsCache(trimmedUsername)
            : await fetchStarsWithCache(trimmedUsername));

      // 保存到 localStorage
      localStorage.setItem(STORAGE_KEYS.username, trimmedUsername);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userInfo));
      // 写回旧 key，兼容历史逻辑
      localStorage.setItem(STORAGE_KEYS.legacyUsername, trimmedUsername);
      localStorage.setItem(STORAGE_KEYS.legacyRepos, JSON.stringify(result.repos));

      if (!result.fromCache) {
        await saveLastFetchedAt(result.fetchedAt);
      }

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
    localStorage.removeItem(STORAGE_KEYS.legacyUsername);
    localStorage.removeItem(STORAGE_KEYS.legacyRepos);

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
      localStorage.setItem(STORAGE_KEYS.legacyRepos, JSON.stringify(result.repos));
      await saveLastFetchedAt(result.fetchedAt);
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
