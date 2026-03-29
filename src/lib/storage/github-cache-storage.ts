/**
 * GitHub Cache Storage
 *
 * 管理 GitHub 数据的 IndexedDB 缓存操作
 */

import type { GitHubRepo } from "@/lib/github/api";

import { getDB } from "./db";
import type { GitHubCacheEntry, GitHubCacheDataType } from "./db";

// ============================================================================
// Convenience Functions for Stars
// ============================================================================



// ============================================================================
// Cache Key Utilities
// ============================================================================

/**
 * 生成缓存键
 */
export function createCacheKey(username: string, dataType: GitHubCacheDataType): string {
  return `${username.toLowerCase()}:${dataType}`;
}

/**
 * 默认缓存过期时间（毫秒）
 */
export const DEFAULT_CACHE_TTL = {
  stars: 60 * 60 * 1000, // 1 小时
  user: 24 * 60 * 60 * 1000, // 24 小时
  repos: 60 * 60 * 1000, // 1 小时
} as const;

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * 获取缓存数据
 */
export async function getCacheEntry<T = unknown>(
  username: string,
  dataType: GitHubCacheDataType
): Promise<{ data: T; fetchedAt: number; isExpired: boolean } | null> {
  const db = await getDB();
  const key = createCacheKey(username, dataType);
  const entry = await db.get("githubCache", key);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  const isExpired = now > entry.expiresAt;

  return {
    data: entry.data as T,
    fetchedAt: entry.fetchedAt,
    isExpired,
  };
}

/**
 * 设置缓存数据
 */
export async function setCacheEntry<T = unknown>(
  username: string,
  dataType: GitHubCacheDataType,
  data: T,
  ttlMs?: number
): Promise<void> {
  const db = await getDB();
  const key = createCacheKey(username, dataType);
  const now = Date.now();
  const ttl = ttlMs ?? DEFAULT_CACHE_TTL[dataType];

  const entry: GitHubCacheEntry = {
    key,
    username: username.toLowerCase(),
    dataType,
    data,
    fetchedAt: now,
    expiresAt: now + ttl,
  };

  await db.put("githubCache", entry);
}

/**
 * 删除特定缓存
 */
export async function deleteCacheEntry(
  username: string,
  dataType: GitHubCacheDataType
): Promise<void> {
  const db = await getDB();
  const key = createCacheKey(username, dataType);
  await db.delete("githubCache", key);
}

/**
 * 删除用户的所有缓存
 */
export async function deleteUserCache(username: string): Promise<void> {
  const db = await getDB();
  const entries = await db.getAllFromIndex(
    "githubCache",
    "by-username",
    username.toLowerCase()
  );

  const tx = db.transaction("githubCache", "readwrite");
  for (const entry of entries) {
    await tx.store.delete(entry.key);
  }
  await tx.done;
}

/**
 * 清理过期缓存
 */
export async function cleanExpiredCache(): Promise<number> {
  const db = await getDB();
  const now = Date.now();

  // 获取所有过期的缓存
  const range = IDBKeyRange.upperBound(now);
  const expiredEntries = await db.getAllFromIndex("githubCache", "by-expires", range);

  if (expiredEntries.length === 0) {
    return 0;
  }

  const tx = db.transaction("githubCache", "readwrite");
  for (const entry of expiredEntries) {
    await tx.store.delete(entry.key);
  }
  await tx.done;

  return expiredEntries.length;
}

/**
 * 清除所有缓存
 */
export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  await db.clear("githubCache");
}

/**
 * 获取 Star 仓库缓存
 */
export async function getStarsCache(username: string): Promise<{
  repos: GitHubRepo[];
  fetchedAt: number;
  isExpired: boolean;
} | null> {
  const result = await getCacheEntry<GitHubRepo[]>(username, "stars");
  if (!result) {
    return null;
  }
  return {
    repos: result.data,
    fetchedAt: result.fetchedAt,
    isExpired: result.isExpired,
  };
}

/**
 * 设置 Star 仓库缓存
 */
export async function setStarsCache(
  username: string,
  repos: GitHubRepo[],
  ttlMs?: number
): Promise<void> {
  await setCacheEntry(username, "stars", repos, ttlMs);
}

/**
 * 检查 Star 缓存是否存在且未过期
 */
export async function hasValidStarsCache(username: string): Promise<boolean> {
  const cache = await getStarsCache(username);
  return cache !== null && !cache.isExpired;
}

/**
 * 获取缓存元数据（不加载完整数据）
 */
export async function getStarsCacheInfo(username: string): Promise<{
  exists: boolean;
  fetchedAt: number | null;
  isExpired: boolean;
  repoCount: number;
} | null> {
  const cache = await getStarsCache(username);
  if (!cache) {
    return {
      exists: false,
      fetchedAt: null,
      isExpired: true,
      repoCount: 0,
    };
  }
  return {
    exists: true,
    fetchedAt: cache.fetchedAt,
    isExpired: cache.isExpired,
    repoCount: cache.repos.length,
  };
}
