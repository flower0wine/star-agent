// =============================================================================
// GitHub API Service
// =============================================================================

import type {
  CacheEntry,
  CacheStatus,
  GetStarredReposOptions,
  GitHubRepo,
  RateLimitStatus,
  ReadmeResponse,
  RepoDetailsResponse,
  StarredResponse,
} from "@/types/github";

import { GitHubApiError } from "@/types/github";

const GITHUB_API_BASE = "https://api.github.com";

// Cache TTL in milliseconds
const CACHE_TTL = {
  STARRED_LIST: 60 * 60 * 1000, // 1 hour
  REPO_DETAILS: 24 * 60 * 60 * 1000, // 24 hours
  README: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Cache keys
const CACHE_KEYS = {
  STARRED_REPOS: "github_starred_repos",
  STARRED_REPOS_META: "github_starred_repos_meta",
  REPO: (owner: string, repo: string) => `github_repo_${owner}_${repo}`,
  README: (owner: string, repo: string) => `github_readme_${owner}_${repo}`,
};

class GitHubApiServiceImpl {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  // =============================================================================
  // Cache Methods
  // =============================================================================

  private getCacheEntry<T>(key: string): CacheEntry<T> | null {
    if (typeof window === "undefined")
      return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw)
        return null;

      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (Date.now() > entry.expires_at) {
        localStorage.removeItem(key);
        return null;
      }

      return entry;
    } catch {
      return null;
    }
  }

  private setCacheEntry<T>(key: string, data: T, ttl: number): void {
    if (typeof window === "undefined")
      return;

    const entry: CacheEntry<T> = {
      data,
      cached_at: Date.now(),
      expires_at: Date.now() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  }

  private removeCacheEntry(key: string): void {
    if (typeof window === "undefined")
      return;
    localStorage.removeItem(key);
  }

  // =============================================================================
  // API Methods
  // =============================================================================

  /**
   * Fetch all starred repositories (Level 1 data)
   */
  async getStarredRepos(options: GetStarredReposOptions = {}): Promise<StarredResponse> {
    const { sort = "updated", direction = "desc", perPage = 100, forceRefresh = false } = options;

    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCacheEntry<{ repos: GitHubRepo[]; totalCount: number }>(
        CACHE_KEYS.STARRED_REPOS
      );
      if (cached) {
        return {
          data: cached.data.repos,
          totalCount: cached.data.totalCount,
          hasMore: false,
        };
      }
    }

    const repos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      const url = new URL(`${GITHUB_API_BASE}/user/starred`);
      url.searchParams.set("per_page", String(perPage));
      url.searchParams.set("page", String(page));
      url.searchParams.set("sort", sort);
      url.searchParams.set("direction", direction);

      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (response.status === 401) {
        throw new GitHubApiError("Authentication required", "AUTH_ERROR", 401);
      }

      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
        if (rateLimitRemaining === "0") {
          throw new GitHubApiError("Rate limit exceeded", "RATE_LIMITED", 403);
        }
      }

      if (!response.ok) {
        throw new GitHubApiError(
          `Failed to fetch starred repos: ${response.statusText}`,
          "UNKNOWN",
          response.status
        );
      }

      const data = await response.json();
      const linkHeader = response.headers.get("Link");

      // Extract total count from header or first response
      if (page === 1 && response.headers.get("Link")) {
        const match = linkHeader?.match(/page=(\d+)>; rel="last"/);
        if (match) {
          totalCount = parseInt(match[1], 10) * perPage;
        }
      }

      // Transform and add repos
      const transformedRepos = (data as GitHubRepo[]).map((repo) => ({
        ...repo,
        cached_at: Date.now(),
      }));

      repos.push(...transformedRepos);

      // Check for next page
      hasMore = linkHeader?.includes("rel=\"next\"") ?? false;
      page++;

      // Safety limit
      if (page > 10)
        break;
    }

    // Cache the results
    const cacheData = { repos, totalCount: repos.length };
    this.setCacheEntry(CACHE_KEYS.STARRED_REPOS, cacheData, CACHE_TTL.STARRED_LIST);

    return {
      data: repos,
      totalCount: totalCount || repos.length,
      hasMore: false,
    };
  }

  /**
   * Fetch single repository details (Level 2 data)
   */
  async getRepoDetails(owner: string, repo: string): Promise<RepoDetailsResponse> {
    const cacheKey = CACHE_KEYS.REPO(owner, repo);

    // Check cache
    const cached = this.getCacheEntry<GitHubRepo>(cacheKey);
    if (cached) {
      return {
        data: cached.data,
        fromCache: true,
      };
    }

    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (response.status === 404) {
      throw new GitHubApiError(`Repository ${owner}/${repo} not found`, "REPO_NOT_FOUND", 404);
    }

    if (response.status === 401) {
      throw new GitHubApiError("Authentication required", "AUTH_ERROR", 401);
    }

    if (!response.ok) {
      throw new GitHubApiError(
        `Failed to fetch repo details: ${response.statusText}`,
        "UNKNOWN",
        response.status
      );
    }

    const data = (await response.json()) as GitHubRepo;
    data.cached_at = Date.now();

    // Cache the result
    this.setCacheEntry(cacheKey, data, CACHE_TTL.REPO_DETAILS);

    return {
      data,
      fromCache: false,
    };
  }

  /**
   * Fetch README content (Level 3 data)
   */
  async getReadme(owner: string, repo: string, branch?: string): Promise<ReadmeResponse> {
    const cacheKey = CACHE_KEYS.README(owner, repo);

    // Check cache
    const cached = this.getCacheEntry<{ content: string; encoding: string }>(cacheKey);
    if (cached) {
      return {
        content: cached.data.content,
        encoding: cached.data.encoding,
        fromCache: true,
      };
    }

    let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
    if (branch) {
      url += `?ref=${branch}`;
    }

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (response.status === 404) {
      return {
        content: "",
        encoding: "utf-8",
        fromCache: false,
      };
    }

    if (response.status === 401) {
      throw new GitHubApiError("Authentication required", "AUTH_ERROR", 401);
    }

    if (!response.ok) {
      throw new GitHubApiError(
        `Failed to fetch README: ${response.statusText}`,
        "UNKNOWN",
        response.status
      );
    }

    const data = await response.json();

    // Decode base64 content
    const content
      = data.encoding === "base64"
        ? atob(data.content.replace(/\n/g, ""))
        : data.content;

    // Check if README is too large
    if (content.length > 1000000) {
      throw new GitHubApiError("README too large", "README_TOO_LARGE");
    }

    // Cache the result
    this.setCacheEntry(
      cacheKey,
      { content, encoding: data.encoding || "utf-8" },
      CACHE_TTL.README
    );

    return {
      content,
      encoding: data.encoding || "utf-8",
      fromCache: false,
    };
  }

  /**
   * Fetch multiple files (Level 3 data)
   */
  async getMultipleFiles(
    owner: string,
    repo: string,
    paths: string[]
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};

    await Promise.all(
      paths.map(async (path) => {
        try {
          const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
          const response = await fetch(url, {
            headers: this.getHeaders(),
          });

          if (!response.ok) {
            results[path] = null;
            return;
          }

          const data = await response.json();

          if (data.encoding === "base64") {
            results[path] = atob(data.content.replace(/\n/g, ""));
          } else {
            results[path] = data.content;
          }
        } catch {
          results[path] = null;
        }
      })
    );

    return results;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    if (typeof window === "undefined")
      return;

    // Clear starred repos
    localStorage.removeItem(CACHE_KEYS.STARRED_REPOS);

    // Clear all repo and readme caches
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("github_repo_") || key?.startsWith("github_readme_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Get cache status
   */
  getCacheStatus(): CacheStatus {
    if (typeof window === "undefined") {
      return {
        starredRepos: { exists: false },
        repoCache: {},
        readmeCache: {},
      };
    }

    const starredReposMeta = this.getCacheEntry<{ repos: GitHubRepo[]; totalCount: number }>(
      CACHE_KEYS.STARRED_REPOS
    );

    const repoCache: CacheStatus["repoCache"] = {};
    const readmeCache: CacheStatus["readmeCache"] = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key)
        continue;

      if (key.startsWith("github_repo_")) {
        const entry = this.getCacheEntry<GitHubRepo>(key);
        if (entry) {
          repoCache[key] = {
            exists: true,
            cached_at: entry.cached_at,
            expires_at: entry.expires_at,
          };
        }
      } else if (key.startsWith("github_readme_")) {
        const entry = this.getCacheEntry<{ content: string; encoding: string }>(key);
        if (entry) {
          readmeCache[key] = {
            exists: true,
            cached_at: entry.cached_at,
            expires_at: entry.expires_at,
          };
        }
      }
    }

    return {
      starredRepos: {
        exists: !!starredReposMeta,
        cached_at: starredReposMeta?.cached_at,
        expires_at: starredReposMeta?.expires_at,
      },
      repoCache,
      readmeCache,
    };
  }

  /**
   * Check rate limit status
   */
  async getRateLimit(): Promise<RateLimitStatus> {
    const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new GitHubApiError(
        `Failed to check rate limit: ${response.statusText}`,
        "UNKNOWN",
        response.status
      );
    }

    const data = await response.json();
    return {
      remaining: data.rate.remaining,
      limit: data.rate.limit,
      reset: new Date(data.rate.reset * 1000),
      used: data.rate.used,
    };
  }

  /**
   * Search repositories by query (client-side search on cached data)
   */
  async searchRepos(query: string, limit = 10): Promise<GitHubRepo[]> {
    const { data: repos } = await this.getStarredRepos();

    const lowerQuery = query.toLowerCase();

    return repos
      .filter((repo) => {
        // Search in name, description, and topics
        const nameMatch = repo.name.toLowerCase().includes(lowerQuery);
        const descMatch = repo.description?.toLowerCase().includes(lowerQuery);
        const topicMatch = repo.topics?.some((t) => t.toLowerCase().includes(lowerQuery));
        const langMatch = repo.language?.toLowerCase().includes(lowerQuery);

        return nameMatch || descMatch || topicMatch || langMatch;
      })
      .slice(0, limit);
  }
}

// Export singleton instance
export const githubApi = new GitHubApiServiceImpl();
