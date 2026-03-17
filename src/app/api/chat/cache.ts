/**
 * Repository Cache
 *
 * In-memory cache for GitHub repositories (star agent only)
 */

import type { GitHubRepo } from "@/lib/github/api";
import { CACHE_TTL } from "./config";

// Cache structure: username -> { repos, timestamp }
const repoCache = new Map<string, { repos: GitHubRepo[]; timestamp: number }>();

/**
 * Get repositories from cache or fetch from API
 * @param username GitHub username
 * @returns Array of starred repositories
 */
export async function getRepos(username: string): Promise<GitHubRepo[]> {
  const cached = repoCache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.repos;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/github/stars/${username}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch repositories");
  }

  const data = await response.json();
  repoCache.set(username, { repos: data.repos, timestamp: Date.now() });
  return data.repos;
}

/**
 * Clear cache for a specific user
 */
export function clearUserCache(username: string): void {
  repoCache.delete(username);
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  repoCache.clear();
}
