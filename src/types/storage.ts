// =============================================================================
// Storage Layer Type Definitions
// =============================================================================

import type { GitHubRepo } from "./github";

// -----------------------------------------------------------------------------
// Storage Keys
// -----------------------------------------------------------------------------

export const STORAGE_KEYS = {
  // Auth
  GITHUB_TOKEN: "github_access_token",
  GITHUB_USER: "github_user",

  // Conversations
  CONVERSATIONS: "conversations",
  CONVERSATION_PREFIX: "conversation_",

  // Settings
  SETTINGS: "app_settings",

  // Cache
  STARRED_REPOS: "github_starred_repos",
  REPO_CACHE_PREFIX: "repo_",
  README_CACHE_PREFIX: "readme_",

  // UI State
  LAYOUT: "app_layout",
} as const;

// -----------------------------------------------------------------------------
// Settings Types
// -----------------------------------------------------------------------------

export type Theme = "light" | "dark" | "system";
export type FontSize = "sm" | "md" | "lg";

export interface AppSettings {
  // Appearance
  theme: Theme;
  fontSize: FontSize;

  // AI
  model: string;
  streamingEnabled: boolean;

  // Behavior
  sidebarExpanded: boolean;
  autoScroll: boolean;

  // Language
  language: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  fontSize: "md",
  model: "anthropic/claude-3.5-sonnet",
  streamingEnabled: true,
  sidebarExpanded: true,
  autoScroll: true,
  language: "en",
};

// -----------------------------------------------------------------------------
// Conversation Types
// -----------------------------------------------------------------------------

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  updatedAt: number;
}

// -----------------------------------------------------------------------------
// Cache Types
// -----------------------------------------------------------------------------

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

// TTL values in milliseconds
export const CACHE_TTL = {
  STARRED_REPOS: 60 * 60 * 1000, // 1 hour
  REPO_DETAILS: 24 * 60 * 60 * 1000, // 24 hours
  README: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// -----------------------------------------------------------------------------
// Storage Error Types
// -----------------------------------------------------------------------------

export enum StorageErrorCode {
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  NOT_AVAILABLE = "NOT_AVAILABLE",
  PARSE_ERROR = "PARSE_ERROR",
}

export class StorageError extends Error {
  constructor(
    message: string,
    public code: StorageErrorCode,
    public key?: string
  ) {
    super(message);
    this.name = "StorageError";
  }
}

// -----------------------------------------------------------------------------
// Layout Types
// -----------------------------------------------------------------------------

export interface LayoutState {
  sidebarExpanded: boolean;
  sidebarOpen: boolean; // For mobile (drawer)
}

// -----------------------------------------------------------------------------
// Repository Interface (for future database migration)
// -----------------------------------------------------------------------------

export interface StorageRepository<T> {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (prefix: string) => Promise<string[]>;
}
