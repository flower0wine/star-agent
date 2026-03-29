/**
 * GitHub Service
 *
 * 封装 GitHub API 调用，集成缓存层
 * 提供统一的数据获取接口
 */

import {
  deleteUserCache,
  getStarsCache,
  hasValidStarsCache,
  setStarsCache,
} from "@/lib/storage";

import { fetchUserStars, getGitHubUser } from "./api";
import type { GitHubRepo } from "./api";

// ============================================================================
// Types
// ============================================================================

export interface GitHubUserInfo {
  login: string;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
}

export interface FetchStarsResult {
  repos: GitHubRepo[];
  fromCache: boolean;
  fetchedAt: number;
}

export interface FetchStarsOptions {
  /** 强制刷新，忽略缓存 */
  forceRefresh?: boolean;
  /** 自定义缓存 TTL（毫秒） */
  cacheTtlMs?: number;
  /** 进度回调 */
  onProgress?: (message: string) => void;
}

// ============================================================================
// GitHub Service
// ============================================================================

/**
 * 获取用户信息
 */
export async function fetchUserInfo(username: string): Promise<GitHubUserInfo> {
  const user = await getGitHubUser(username);
  return {
    login: user.login,
    avatarUrl: user.avatar_url,
    publicRepos: user.public_repos,
    followers: user.followers,
  };
}

/**
 * 获取用户 Star 仓库（带缓存）
 */
export async function fetchStarsWithCache(
  username: string,
  options: FetchStarsOptions = {}
): Promise<FetchStarsResult> {
  const { forceRefresh = false, cacheTtlMs, onProgress } = options;

  // 检查缓存
  if (!forceRefresh) {
    const hasCache = await hasValidStarsCache(username);
    if (hasCache) {
      onProgress?.("从缓存加载仓库数据...");
      const cache = await getStarsCache(username);
      if (cache) {
        return {
          repos: cache.repos,
          fromCache: true,
          fetchedAt: cache.fetchedAt,
        };
      }
    }
  }

  // 从 API 获取
  onProgress?.("正在获取 Star 仓库列表...");
  const repos = await fetchUserStars(username);

  // 保存到缓存
  onProgress?.("缓存数据中...");
  await setStarsCache(username, repos, cacheTtlMs);

  return {
    repos,
    fromCache: false,
    fetchedAt: Date.now(),
  };
}

/**
 * 刷新 Star 仓库缓存
 */
export async function refreshStarsCache(
  username: string,
  cacheTtlMs?: number
): Promise<FetchStarsResult> {
  return fetchStarsWithCache(username, {
    forceRefresh: true,
    cacheTtlMs,
  });
}

/**
 * 清除用户缓存
 */
export async function clearUserCache(username: string): Promise<void> {
  await deleteUserCache(username);
}

/**
 * 验证用户名并获取基本信息
 */
export async function verifyAndGetUser(username: string): Promise<{
  user: GitHubUserInfo;
  stars: FetchStarsResult;
}> {
  // 先验证用户存在
  const user = await fetchUserInfo(username);

  // 获取 Star 仓库
  const stars = await fetchStarsWithCache(username);

  return { user, stars };
}
