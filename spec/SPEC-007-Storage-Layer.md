# SPEC-007: Storage Layer Module

## 1. Module Overview

### 1.1 Purpose

Implement a storage abstraction layer that handles data persistence using localStorage, with architecture designed for future database migration.

### 1.2 Scope

This module handles:
- localStorage operations for all app data
- Session/conversation storage
- User settings storage
- GitHub data cache
- Storage abstraction interface

This module does NOT handle:
- UI components
- Authentication
- API calls
- AI agent

---

## 2. Architecture

### 2.1 Storage Abstraction Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Layer                        │
│                    (Components, Hooks, Stores)                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Interface                            │
│              (Repository Pattern - TypeScript)                  │
│                                                                 │
│   interface StorageRepository<T> {                              │
│     get(key: string): Promise<T | null>;                        │
│     set(key: string, value: T): Promise<void>;                  │
│     delete(key: string): Promise<void>;                         │
│     list(prefix: string): Promise<string[]>;                    │
│   }                                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
            ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐
│  LocalStorage       │      │  (Future)           │
│  Repository         │      │  Database            │
│  Implementation     │      │  Repository          │
│                     │      │  Implementation      │
└─────────────────────┘      └─────────────────────┘
```

### 2.2 Why This Pattern?

1. **Testability**: Easy to mock storage in tests
2. **Extensibility**: Swap implementations without changing app code
3. **Type Safety**: TypeScript interfaces ensure consistency
4. **Migration Path**: Add database support later without refactoring

---

## 3. Data Types

### 3.1 Storage Keys

```typescript
// Storage key constants
const STORAGE_KEYS = {
  // Auth
  GITHUB_TOKEN: "github_access_token",
  GITHUB_USER: "github_user",
  
  // Conversations
  CONVERSATIONS: "conversations",
  CONVERSATION_PREFIX: "conversation_",  // + ID
  
  // Settings
  SETTINGS: "app_settings",
  
  // Cache
  STARRED_REPOS: "github_starred_repos",
  REPO_CACHE_PREFIX: "repo_",
  README_CACHE_PREFIX: "readme_",
  
  // UI State
  LAYOUT: "app_layout",
} as const;
```

### 3.2 Data Schemas

```typescript
// src/types/storage.ts

// User Settings
interface AppSettings {
  theme: "light" | "dark" | "system";
  model: string;
  sidebarExpanded: boolean;
  language: string;
  fontSize: "sm" | "md" | "lg";
}

// Conversation
interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// GitHub Data
interface CachedRepo {
  data: GitHubRepo;
  cachedAt: number;
  expiresAt: number;
}
```

---

## 4. Implementation

### 4.1 Base Storage Service

```typescript
// lib/storage/storage.ts

export interface StorageRepository<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

// LocalStorage Implementation
export class LocalStorageRepository<T> implements StorageRepository<T> {
  async get(key: string): Promise<T | null> {
    if (typeof window === "undefined") return null;
    
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  
  async set(key: string, value: T): Promise<void> {
    if (typeof window === "undefined") return;
    
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  async delete(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }
  
  async list(prefix: string): Promise<string[]> {
    if (typeof window === "undefined") return [];
    
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
```

### 4.2 Conversation Storage

```typescript
// lib/storage/conversation-storage.ts

export class ConversationStorage {
  private repository = new LocalStorageRepository<Conversation>();
  private readonly PREFIX = "conversation_";
  
  // Get all conversations (summary list)
  async getAll(): Promise<ConversationSummary[]> {
    const keys = await this.repository.list(this.PREFIX);
    const conversations: ConversationSummary[] = [];
    
    for (const key of keys) {
      const conv = await this.repository.get(key);
      if (conv) {
        conversations.push({
          id: conv.id,
          title: conv.title,
          lastMessage: conv.messages.at(-1)?.content ?? "",
          messageCount: conv.messages.length,
          updatedAt: conv.updatedAt,
        });
      }
    }
    
    // Sort by updated time
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  
  // Get single conversation with messages
  async get(id: string): Promise<Conversation | null> {
    return this.repository.get(`${this.PREFIX}${id}`);
  }
  
  // Save conversation
  async save(conversation: Conversation): Promise<void> {
    conversation.updatedAt = Date.now();
    await this.repository.set(
      `${this.PREFIX}${conversation.id}`,
      conversation
    );
    
    // Update conversation list
    await this.updateList();
  }
  
  // Delete conversation
  async delete(id: string): Promise<void> {
    await this.repository.delete(`${this.PREFIX}${id}`);
  }
  
  // Create new conversation
  async create(title: string = "New Chat"): Promise<Conversation> {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    
    await this.save(conversation);
    return conversation;
  }
}
```

### 4.3 Settings Storage

```typescript
// lib/storage/settings-storage.ts

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  model: "anthropic/claude-3.5-sonnet",
  sidebarExpanded: true,
  language: "en",
  fontSize: "md",
};

export class SettingsStorage {
  private repository = new LocalStorageRepository<AppSettings>();
  private readonly KEY = "app_settings";
  
  // Load settings with defaults
  async load(): Promise<AppSettings> {
    const settings = await this.repository.get(this.KEY);
    return { ...DEFAULT_SETTINGS, ...settings };
  }
  
  // Save settings
  async save(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.load();
    const updated = { ...current, ...settings };
    await this.repository.set(this.KEY, updated);
  }
  
  // Reset to defaults
  async reset(): Promise<void> {
    await this.repository.set(this.KEY, DEFAULT_SETTINGS);
  }
  
  // Get single setting
  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.load();
    return settings[key];
  }
  
  // Set single setting
  async set<K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): Promise<void> {
    await this.save({ [key]: value });
  }
}
```

### 4.4 GitHub Data Cache

```typescript
// lib/storage/github-cache.ts

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

export class GitHubCache {
  private repository = new LocalStorageRepository<CacheEntry<any>>();
  
  // Cache TTL values (in milliseconds)
  private readonly TTL = {
    STARRED_REPOS: 60 * 60 * 1000,       // 1 hour
    REPO_DETAILS: 24 * 60 * 60 * 1000,    // 24 hours
    README: 7 * 24 * 60 * 60 * 1000,      // 7 days
  };
  
  // Starred repos
  async getStarredRepos(): Promise<GitHubRepo[] | null> {
    const entry = await this.repository.get("github_starred_repos");
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      await this.repository.delete("github_starred_repos");
      return null;
    }
    
    return entry.data;
  }
  
  async setStarredRepos(repos: GitHubRepo[]): Promise<void> {
    const entry: CacheEntry<GitHubRepo[]> = {
      data: repos,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.TTL.STARRED_REPOS,
    };
    await this.repository.set("github_starred_repos", entry);
  }
  
  // Individual repo
  async getRepo(owner: string, repo: string): Promise<GitHubRepo | null> {
    const key = `repo_${owner}_${repo}`;
    const entry = await this.repository.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    
    return entry.data;
  }
  
  async setRepo(owner: string, repo: string, data: GitHubRepo): Promise<void> {
    const key = `repo_${owner}_${repo}`;
    const entry: CacheEntry<GitHubRepo> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.TTL.REPO_DETAILS,
    };
    await this.repository.set(key, entry);
  }
  
  // README
  async getReadme(owner: string, repo: string): Promise<string | null> {
    const key = `readme_${owner}_${repo}`;
    const entry = await this.repository.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    
    return entry.data;
  }
  
  async setReadme(owner: string, repo: string, content: string): Promise<void> {
    const key = `readme_${owner}_${repo}`;
    const entry: CacheEntry<string> = {
      data: content,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.TTL.README,
    };
    await this.repository.set(key, entry);
  }
  
  // Clear all cache
  async clear(): Promise<void> {
    const keys = await this.repository.list("github_");
    for (const key of keys) {
      await this.repository.delete(key);
    }
  }
}
```

---

## 5. React Integration

### 5.1 Storage Hook

```typescript
// hooks/use-storage.ts

// Generic storage hook with sync
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load on mount
  useEffect(() => {
    const load = async () => {
      const repository = new LocalStorageRepository<T>();
      const stored = await repository.get(key);
      if (stored !== null) {
        setValue(stored);
      }
      setIsLoading(false);
    };
    load();
  }, [key]);
  
  // Save function
  const save = useCallback(async (newValue: T | ((prev: T) => T)) => {
    const repository = new LocalStorageRepository<T>();
    const resolved = typeof newValue === "function"
      ? (newValue as (prev: T) => T)(value)
      : newValue;
    
    await repository.set(key, resolved);
    setValue(resolved);
  }, [key, value]);
  
  return [value, save, isLoading];
}
```

### 5.2 Settings Hook

```typescript
// hooks/use-settings.ts

export function useSettings() {
  const storage = useMemo(() => new SettingsStorage(), []);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    storage.load().then((s) => {
      setSettings(s);
      setIsLoading(false);
    });
  }, [storage]);
  
  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    await storage.save(partial);
    setSettings((prev) => prev ? { ...prev, ...partial } : null);
  }, [storage]);
  
  return { settings, updateSettings, isLoading };
}
```

---

## 6. Database Migration Path

### 6.1 Future Interface

```typescript
// Future: Database repository interface
export interface DatabaseRepository<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  
  // Additional database operations
  query(filter: Record<string, any>): Promise<T[]>;
  bulkSet(items: Array<{ key: string; value: T }>): Promise<void>;
}

// Example future implementation
export class PostgresRepository<T> implements DatabaseRepository<T> {
  constructor(private table: string) {}
  
  async get(key: string): Promise<T | null> {
    const result = await db.query(
      `SELECT value FROM ${this.table} WHERE key = $1`,
      [key]
    );
    return result.rows[0]?.value ?? null;
  }
  
  // ... other methods
}
```

### 6.2 Migration Strategy

1. **Phase 1**: LocalStorage (current spec)
2. **Phase 2**: Add database repository
3. **Phase 3**: Feature flag for gradual migration
4. **Phase 4**: Full database switch

```typescript
// Migration wrapper
class HybridStorage<T> implements StorageRepository<T> {
  constructor(
    private local: LocalStorageRepository<T>,
    private db: DatabaseRepository<T> | null
  ) {}
  
  async get(key: string): Promise<T | null> {
    // Try database first if available
    if (this.db) {
      const dbValue = await this.db.get(key);
      if (dbValue !== null) return dbValue;
    }
    
    return this.local.get(key);
  }
  
  async set(key: string, value: T): Promise<void> {
    await this.local.set(key, value);
    
    if (this.db) {
      await this.db.set(key, value);
    }
  }
}
```

---

## 7. Error Handling

### 7.1 Storage Errors

```typescript
enum StorageErrorCode {
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  NOT_AVAILABLE = "NOT_AVAILABLE",
  PARSE_ERROR = "PARSE_ERROR",
}

interface StorageError extends Error {
  code: StorageErrorCode;
  key?: string;
}

// Handle quota exceeded
async function safeSet(key: string, value: any): Promise<void> {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      // Clear old cache to make space
      await clearOldCache();
      throw new StorageError("Storage quota exceeded", "QUOTA_EXCEEDED", key);
    }
    throw error;
  }
}
```

### 7.2 Data Recovery

```typescript
// Recovery from corrupted data
async function recoverStorage(): Promise<void> {
  const backup: Record<string, any> = {};
  
  // Backup existing data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      try {
        backup[key] = JSON.parse(localStorage.getItem(key)!);
      } catch {
        // Skip corrupted entries
      }
    }
  }
  
  // Clear and restore
  localStorage.clear();
  
  for (const [key, value] of Object.entries(backup)) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Skip entries that don't fit
    }
  }
}
```

---

## 8. Acceptance Criteria

### 8.1 Functional Requirements

- [ ] Conversations saved to localStorage
- [ ] Settings persist across page reloads
- [ ] GitHub data cached with TTL
- [ ] Storage handles quota limits gracefully
- [ ] Data recoverable from corruption

### 8.2 Performance Requirements

- [ ] Storage operations non-blocking
- [ ] Large conversations load efficiently
- [ ] Cache retrieval < 50ms

### 8.3 Extensibility Requirements

- [ ] Repository interface defined
- [ ] Easy to swap implementations
- [ ] Type-safe throughout
- [ ] Migration path documented

---

## 9. File Checklist

```
src/
├── lib/
│   └── storage/
│       ├── storage.ts              # Base repository
│       ├── conversation-storage.ts # Conversation persistence
│       ├── settings-storage.ts    # Settings persistence
│       └── github-cache.ts        # GitHub data cache
│
├── hooks/
│   ├── use-storage.ts              # Generic storage hook
│   ├── use-settings.ts             # Settings hook
│   └── use-conversations.ts        # Conversations hook
│
├── stores/
│   ├── settings-store.ts           # Settings store
│   └── conversation-store.ts       # Conversation store
│
└── types/
    └── storage.ts                  # Storage type definitions
```

---

## 10. Best Practices

### 10.1 Storage Optimization

1. **Compress large data**: Use LZ-string for large conversations
2. **Lazy load**: Only load active conversation
3. **Pagination**: Store large message lists in chunks
4. **Cleanup**: Remove old conversations automatically

### 10.2 Security Considerations

1. **No sensitive data**: Don't store tokens in localStorage (use cookies)
2. **Sanitize**: Validate data on retrieval
3. **Encrypt**: For sensitive settings, consider encryption

### 10.3 Monitoring

1. **Track errors**: Log storage failures
2. **Monitor quota**: Alert when approaching limit
3. **Usage metrics**: Track storage size over time
