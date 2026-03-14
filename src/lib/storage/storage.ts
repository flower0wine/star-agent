// =============================================================================
// Base Storage Repository
// Provides localStorage abstraction with type safety
// =============================================================================

export interface StorageRepository<T> {
  get: (key: string) => Promise<T | null>;
  set: (key: string, value: T) => Promise<void>;
  delete: (key: string) => Promise<void>;
  list: (prefix: string) => Promise<string[]>;
}

export class LocalStorageRepository<T> implements StorageRepository<T> {
  async get(key: string): Promise<T | null> {
    if (typeof window === "undefined")
      return null;

    const value = localStorage.getItem(key);
    if (!value)
      return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: T): Promise<void> {
    if (typeof window === "undefined")
      return;

    localStorage.setItem(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    if (typeof window === "undefined")
      return;
    localStorage.removeItem(key);
  }

  async list(prefix: string): Promise<string[]> {
    if (typeof window === "undefined")
      return [];

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
}

// Storage key constants
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

/**
 * Factory function to create a storage repository instance
 * Provides a simple way to get a typed localStorage repository
 */
export function createStorageRepository<T>(): StorageRepository<T> {
  return new LocalStorageRepository<T>();
}
