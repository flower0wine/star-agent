# SPEC-003: GitHub Data Fetching Module

## 1. Module Overview

### 1.1 Purpose

Fetch and manage user's GitHub starred repositories data, providing a structured interface for the AI agent to query and analyze repositories.

### 1.2 Scope

This module handles:
- Fetching starred repositories from GitHub API
- Pagination for large star lists
- Extracting relevant metadata (name, description, topics, stars)
- Fetching README content on demand (progressive disclosure)
- Caching fetched data locally

This module does NOT handle:
- Authentication (see SPEC-002)
- AI conversation (see SPEC-004)
- Data storage (see SPEC-007)

---

## 2. Data Strategy: Progressive Disclosure

### 2.1 Why Progressive Disclosure?

- GitHub API rate limits (5,000 requests/hour for authenticated users)
- Full READMEs can be very large (10KB - 100KB+)
- Loading all READMEs upfront would:
  - Exhaust rate limits
  - Slow initial load significantly
  - Exceed context window for AI

### 2.2 Disclosure Levels

```
Level 1: Basic Info (Always loaded)
├── Repository name
├── Description
├── Topics/Tags
├── Primary language
├── Star count
├── Fork count
└── Updated timestamp

Level 2: Extended Metadata (On demand)
├── Owner info (avatar, name)
├── License
├── Open issues count
├── Default branch
└── Repository size

Level 3: Content (Only when needed)
├── README content
├── Package.json (for JS projects)
└── Key source files
```

### 2.3 Flow Diagram

```
User Question
     │
     ▼
┌─────────────────┐
│  AI Agent       │
│  Analyzes       │
│  Level 1 Data   │
└────────┬────────┘
         │
         ▼
  ┌─────────────┐
  │ Needs More  │──── No ────► Provide Answer
  │ Context?    │
  └──────┬──────┘
         │ Yes
         ▼
  ┌─────────────────────────────────┐
  │  Fetch Specific Repository     │
  │  Details (Level 2/3)           │
  │  Only for relevant repos       │
  └──────────────┬──────────────────┘
                 │
                 ▼
          Provide Detailed Answer
```

---

## 3. GitHub API Integration

### 3.1 API Endpoints Used

| Endpoint | Purpose | Rate Limit |
|----------|---------|------------|
| `GET /users/{username}/starred` | List starred repos | 5,000/hr |
| `GET /repos/{owner}/{repo}` | Get repo details | 5,000/hr |
| `GET /repos/{owner}/{repo}/readme` | Get README | 5,000/hr |
| `GET /repos/{owner}/{repo}/contents/{path}` | Get file content | 5,000/hr |

### 3.2 Pagination

GitHub API returns paginated results:
- Default: 30 items per page
- Maximum: 100 items per page
- Use `Link` header for pagination

```typescript
// Example: Fetch all starred repos
async function fetchAllStarredRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.github.com/users/me/starred?per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const data = await response.json();
    repos.push(...data);
    
    // Check for next page via Link header
    const linkHeader = response.headers.get("Link");
    hasMore = linkHeader?.includes('rel="next"') ?? false;
    page++;
  }

  return repos;
}
```

---

## 4. Data Types

### 4.1 Repository Type Definitions

```typescript
// src/types/github.ts

// Level 1: Basic info (lightweight)
interface RepoBasic {
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

// Level 2: Extended metadata
interface RepoExtended extends RepoBasic {
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

// Level 3: Content
interface RepoContent {
  readme: string | null;
  packageJson?: object | null;
}

// Full repository type
interface GitHubRepo extends RepoExtended, Partial<RepoContent> {
  // Cache metadata
  cached_at?: number;
  readme_fetched_at?: number;
}
```

### 4.2 API Response Types

```typescript
interface StarredResponse {
  data: GitHubRepo[];
  totalCount: number;
  hasMore: boolean;
  nextPage?: number;
}

interface RepoDetailsResponse {
  data: GitHubRepo;
  fromCache: boolean;
}

interface ReadmeResponse {
  content: string;
  encoding: string;
  fromCache: boolean;
}
```

---

## 5. Service Interface

### 5.1 GitHub API Service

```typescript
// lib/services/github-api.ts

interface GitHubApiService {
  // Fetch all starred repositories (Level 1)
  getStarredRepos(options?: {
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    perPage?: number;
    forceRefresh?: boolean;
  }): Promise<StarredResponse>;

  // Fetch single repository details (Level 2)
  getRepoDetails(owner: string, repo: string): Promise<RepoDetailsResponse>;

  // Fetch README content (Level 3)
  getReadme(owner: string, repo: string, branch?: string): Promise<ReadmeResponse>;

  // Fetch multiple files (Level 3)
  getMultipleFiles(
    owner: string, 
    repo: string, 
    paths: string[]
  ): Promise<Record<string, string | null>>;

  // Clear cache
  clearCache(): void;

  // Get cache status
  getCacheStatus(): CacheStatus;
}
```

### 5.2 Usage Examples

```typescript
import { useGitHubApi } from "@/lib/hooks/use-github-api";

// Fetch starred repos (Level 1 only)
const { repos, loading, error } = useGitHubApi();

// Fetch specific repo README (Level 3)
const { readme } = useGitHubApi().fetchReadme("owner", "repo");

// Force refresh
const { refresh } = useGitHubApi();
await refresh({ forceRefresh: true });
```

---

## 6. Caching Strategy

### 6.1 localStorage Cache

**Cache Keys**:
- `github_starred_repos`: Array of starred repos
- `github_repo_{owner}_{repo}`: Individual repo cache
- `github_readme_{owner}_{repo}`: README content cache

**Cache Structure**:
```typescript
interface CacheEntry<T> {
  data: T;
  cached_at: number;
  expires_at: number;
}
```

### 6.2 Cache Invalidation

| Data Type | Cache TTL | Invalidation |
|-----------|-----------|--------------|
| Starred list | 1 hour | Manual refresh |
| Repo details | 24 hours | Manual refresh |
| README content | 7 days | Manual refresh |

### 6.3 Cache Management

```typescript
class GitHubCache {
  private maxSize = 50 * 1024 * 1024; // 50MB

  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      cached_at: Date.now(),
      expires_at: Date.now() + ttl,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expires_at) {
      localStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  }
}
```

---

## 7. Rate Limit Handling

### 7.1 Rate Limit Status

```typescript
interface RateLimitStatus {
  remaining: number;
  limit: number;
  reset: Date;
  used: number;
}

// Check before each request
async function checkRateLimit(token: string): Promise<RateLimitStatus> {
  const response = await fetch("https://api.github.com/rate_limit", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  return {
    remaining: data.rate.remaining,
    limit: data.rate.limit,
    reset: new Date(data.rate.reset * 1000),
    used: data.rate.used,
  };
}
```

### 7.2 Rate Limit Strategies

1. **Batch Requests**: Fetch all starred repos in one paginated request
2. **Cache Aggressively**: Cache all Level 1/2 data locally
3. **Lazy Load READMEs**: Only fetch when explicitly needed
4. **Queue Requests**: If approaching limit, queue and batch

---

## 8. Progressive Disclosure Implementation

### 8.1 Agent Tool Design

The AI agent will have access to tools that implement progressive disclosure:

```typescript
// mastra/tools/repo-tools.ts

// Tool 1: Search repos by topic/name (uses Level 1)
const searchReposTool = {
  id: "search_repos",
  name: "Search Repositories",
  description: "Search starred repositories by name, topic, or description",
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().optional().default(10),
  }),
};

// Tool 2: Get repo details (fetches Level 2)
const getRepoDetailsTool = {
  id: "get_repo_details",
  name: "Get Repository Details",
  description: "Get detailed information about a specific repository",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
  }),
};

// Tool 3: Get README (fetches Level 3)
const getReadmeTool = {
  id: "get_readme",
  name: "Get Repository README",
  description: "Get the README content of a repository for detailed analysis",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
  }),
};
```

### 8.2 Agent Instructions for Progressive Disclosure

```
When helping users find repositories:
1. First, search through the basic repo info (name, description, topics)
2. If more detail is needed for a specific repo, use getRepoDetails
3. Only fetch README content when the user specifically asks for detailed 
   analysis or when comparing very similar repositories
4. Always explain why you're fetching more detailed information
```

---

## 9. Component Integration

### 9.1 Data Loading States

```typescript
// Loading states for UI
interface RepoListState {
  loading: boolean;
  progress?: number;        // For large lists
  total?: number;
  repos: GitHubRepo[];
  error: string | null;
}
```

### 9.2 UI Components Using This Module

- **RepoList**: Display starred repos in sidebar (Level 1)
- **RepoCard**: Show repo preview in chat (Level 1-2)
- **RepoDetail**: Full repo view when expanded (Level 2-3)
- **ReadmeViewer**: Display README content (Level 3)

---

## 10. Error Handling

### 10.1 Error Types

| Error | Cause | Handling |
|-------|-------|----------|
| `RATE_LIMITED` | API limit reached | Show message, use cache, offer refresh later |
| `REPO_NOT_FOUND` | Repo was deleted | Remove from cache, show message |
| `README_TOO_LARGE` | README > 1MB | Truncate or show error |
| `NETWORK_ERROR` | No connection | Retry with exponential backoff |
| `AUTH_ERROR` | Token expired | Redirect to re-authenticate |

### 10.2 Error Recovery

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    backoffMs?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, backoffMs = 1000 } = options;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(backoffMs * Math.pow(2, i));
    }
  }
  throw new Error("Max retries exceeded");
}
```

---

## 11. Acceptance Criteria

### 11.1 Functional Requirements

- [ ] Fetch all starred repositories on initial load
- [ ] Handle pagination correctly for users with 100+ stars
- [ ] Extract and store: name, description, topics, language, stars, forks, updated_at
- [ ] Fetch README on demand (not upfront)
- [ ] Cache all fetched data in localStorage
- [ ] Handle rate limiting gracefully
- [ ] Provide clear loading indicators

### 11.2 Performance Requirements

- [ ] Initial starred list load < 5 seconds (for 100 repos)
- [ ] README fetch < 2 seconds
- [ ] Cache reduces repeat fetches to < 100ms
- [ ] Smooth scrolling with 1000+ repos (virtualization)

### 11.3 Data Quality

- [ ] Repository data is accurate and up-to-date
- [ ] Topics are properly parsed (trimmed, lowercase)
- [ ] Timestamps are in ISO format
- [ ] README is decoded from Base64 correctly

---

## 12. File Checklist

```
src/
├── lib/
│   └── services/
│       └── github-api.ts      # Main API service
│
├── hooks/
│   └── use-github-api.ts     # React hook
│
├── mastra/
│   └── tools/
│       └── repo-tools.ts     # Mastra tools for agent
│
└── types/
    └── github.ts             # Type definitions
```

---

## 13. Dependencies

### 13.1 Required Packages

No additional packages required - using native fetch.

### 13.2 Optional Enhancements

- **React Query**: For advanced caching and state management (optional, not required)
- **SWR**: For data fetching with cache (optional, not required)

---

## 14. Testing Strategy

### 14.1 Unit Tests

- Caching logic
- Rate limit parsing
- Data transformation
- Error handling

### 14.2 Integration Tests

- API calls (with mock server)
- Full OAuth flow (with test account)
- Cache persistence

### 14.3 Manual Testing

- Test with accounts having 0, 10, 100, 1000+ stars
- Test rate limiting behavior
- Test cache invalidation
