// =============================================================================
// GitHub Data Cache Service
// Handles caching of GitHub API responses with TTL
// =============================================================================

import { LocalStorageRepository, STORAGE_KEYS } from "./storage";
import type { GitHubRepo } from "@/types/github";
import type { CacheEntry } from "@/types/storage";
import { CACHE_TTL } from "@/types/storage";

export class GitHubCache {
  private repository = new LocalStorageRepository<CacheEntry<unknown>>();

  // ---------------------------------------------------------------------------
  // Starred Repos Cache
  // ---------------------------------------------------------------------------

  /**
   * Get cached starred repositories
   */
  async getStarredRepos(): Promise<GitHubRepo[] | null> {
    const entry = await this.repository.get(STORAGE_KEYS.STARRED_REPOS);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      await this.repository.delete(STORAGE_KEYS.STARRED_REPOS);
      return null;
    }

    return entry.data as GitHubRepo[];
  }

  /**
   * Cache starred repositories
   */
  async setStarredRepos(repos: GitHubRepo[]): Promise<void> {
    const entry: CacheEntry<GitHubRepo[]> = {
      data: repos,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.STARRED_REPOS,
    };
    await this.repository.set(STORAGE_KEYS.STARRED_REPOS, entry as unknown as CacheEntry<unknown>);
  }

  /**
   * Check if starred repos cache is valid
   */
  async hasStarredRepos(): Promise<boolean> {
    const repos = await this.getStarredRepos();
    return repos !== null;
  }

  // ---------------------------------------------------------------------------
  // Individual Repo Cache
  // ---------------------------------------------------------------------------

  /**
   * Get cached repo details
   */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
    const key = `${STORAGE_KEYS.REPO_CACHE_PREFIX}${owner}_${repo}`;
    const entry = await this.repository.get(key);

    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        await this.repository.delete(key);
      }
      return null;
    }

    return entry.data as GitHubRepo;
  }

  /**
   * Cache repo details
   */
  async setRepo(owner: string, repo: string, data: GitHubRepo): Promise<void> {
    const key = `${STORAGE_KEYS.REPO_CACHE_PREFIX}${owner}_${repo}`;
    const entry: CacheEntry<GitHubRepo> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.REPO_DETAILS,
    };
    await this.repository.set(key, entry as unknown as CacheEntry<unknown>);
  }

  // ---------------------------------------------------------------------------
  // README Cache
  // ---------------------------------------------------------------------------

  /**
   * Get cached README content
   */
  async getReadme(owner: string, repo: string): Promise<string | null> {
    const key = `${STORAGE_KEYS.README_CACHE_PREFIX}${owner}_${repo}`;
    const entry = await this.repository.get(key);

    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        await this.repository.delete(key);
      }
      return null;
    }

    return entry.data as string;
  }

  /**
   * Cache README content
   */
  async setReadme(owner: string, repo: string, content: string): Promise<void> {
    const key = `${STORAGE_KEYS.README_CACHE_PREFIX}${owner}_${repo}`;
    const entry: CacheEntry<string> = {
      data: content,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_TTL.README,
    };
    await this.repository.set(key, entry as unknown as CacheEntry<unknown>);
  }

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /**
   * Clear all GitHub cache
   */
  async clear(): Promise<void> {
    const keys = await this.repository.list("github_");
    for (const key of keys) {
      await this.repository.delete(key);
    }
  }

  /**
   * Clear only starred repos cache
   */
  async clearStarredRepos(): Promise<void> {
    await this.repository.delete(STORAGE_KEYS.STARRED_REPOS);
  }

  /**
   * Get cache status
   */
  async getStatus(): Promise<{
    starredRepos: { exists: boolean; cachedAt?: number; expiresAt?: number };
  }> {
    const entry = await this.repository.get(STORAGE_KEYS.STARRED_REPOS);
    return {
      starredRepos: {
        exists: !!entry,
        cachedAt: entry?.cachedAt,
        expiresAt: entry?.expiresAt,
      },
    };
  }
}

// Export singleton instance
export const githubCache = new GitHubCache();
