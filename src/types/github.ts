// =============================================================================
// GitHub API Type Definitions
// =============================================================================

// =============================================================================
// Authentication Types
// =============================================================================

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  scope: string;
  expires_at?: number;
  refresh_token?: string;
}

export type AuthErrorCode
  = | "AUTH_CANCELLED"
    | "TOKEN_EXCHANGE_FAILED"
    | "TOKEN_EXPIRED"
    | "INVALID_STATE"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Level 1: Basic info (lightweight, always loaded)
 */
export interface RepoBasic {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  topics: string[];
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

/**
 * Level 2: Extended metadata (fetched on demand)
 */
export interface RepoExtended extends RepoBasic {
  license: {
    name: string;
    spdx_id: string;
  } | null;
  open_issues_count: number;
  default_branch: string;
  size: number;
  watchers_count: number;
  language_breakdown?: Record<string, number>;
}

/**
 * Level 3: Content (only when needed)
 */
export interface RepoContent {
  readme: string | null;
  packageJson?: object | null;
}

/**
 * Full repository type with optional content
 */
export interface GitHubRepo extends RepoExtended, Partial<RepoContent> {
  // Cache metadata
  cached_at?: number;
  readme_fetched_at?: number;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface StarredResponse {
  data: GitHubRepo[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: number;
}

export interface RepoDetailsResponse {
  data: GitHubRepo;
  fromCache: boolean;
}

export interface ReadmeResponse {
  content: string;
  encoding: string;
  fromCache: boolean;
}

// =============================================================================
// Cache Types
// =============================================================================

export interface CacheEntry<T> {
  data: T;
  cached_at: number;
  expires_at: number;
}

export interface CacheStatus {
  starredRepos: {
    exists: boolean;
    cached_at?: number;
    expires_at?: number;
  };
  repoCache: Record<string, {
    exists: boolean;
    cached_at?: number;
    expires_at?: number;
  }>;
  readmeCache: Record<string, {
    exists: boolean;
    cached_at?: number;
    expires_at?: number;
  }>;
}

// =============================================================================
// Rate Limit Types
// =============================================================================

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
  used: number;
}

// =============================================================================
// Error Types
// =============================================================================

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public code: "RATE_LIMITED" | "REPO_NOT_FOUND" | "README_TOO_LARGE" | "NETWORK_ERROR" | "AUTH_ERROR" | "UNKNOWN",
    public statusCode?: number
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

// =============================================================================
// Service Options
// =============================================================================

export interface GetStarredReposOptions {
  sort?: "created" | "updated" | "pushed" | "full_name";
  direction?: "asc" | "desc";
  perPage?: number;
  forceRefresh?: boolean;
}

export interface GitHubApiService {
  getStarredRepos: (options?: GetStarredReposOptions) => Promise<StarredResponse>;
  getRepoDetails: (owner: string, repo: string) => Promise<RepoDetailsResponse>;
  getReadme: (owner: string, repo: string, branch?: string) => Promise<ReadmeResponse>;
  getMultipleFiles: (
    owner: string,
    repo: string,
    paths: string[]
  ) => Promise<Record<string, string | null>>;
  clearCache: () => void;
  getCacheStatus: () => CacheStatus;
}

// =============================================================================
// Agent Tool Types
// =============================================================================

export interface SearchReposParams {
  query: string;
  limit?: number;
  language?: string;
  minStars?: number;
}

export interface SearchReposResult {
  results: GitHubRepo[];
  total: number;
  query: string;
}
