# SPEC-004: Mastra AI Agent Module

## 1. Module Overview

### 1.1 Purpose

Implement an AI Agent using Mastra framework that helps users find relevant GitHub repositories from their starred收藏 through natural language conversations.

### 1.2 Scope

This module handles:
- Mastra Agent setup with OpenRouter model
- System instructions defining agent behavior
- Tools for repository search and details retrieval
- Conversation memory management
- Streaming response handling

This module does NOT handle:
- UI components (see SPEC-005, SPEC-006)
- Authentication (see SPEC-002)
- Data fetching (see SPEC-003)

---

## 2. Architecture

### 2.1 Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Interface                              │
│              (Chat UI - SPEC-005, SPEC-006)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Mastra Agent                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Instructions                            │   │
│  │  - Role definition                                        │   │
│  │  - Behavior guidelines                                    │   │
│  │  - Tool usage rules                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │  Model:      │   Memory:    │    Tools:    │                │
│  │  OpenRouter  │   Session    │   GitHub API  │                │
│  └──────────────┴──────────────┴──────────────┘                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Data Layer                             │
│              (Repository Search & Details - SPEC-003)         │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Model Configuration

**Provider**: OpenRouter

**Supported Models** (in priority order):

| Model | Context Window | Recommended For |
|-------|----------------|-----------------|
| `anthropic/claude-3.5-sonnet` | 200K | Best balance of quality/speed |
| `anthropic/claude-3-haiku` | 200K | Fast, cost-effective |
| `google/gemini-pro-1.5` | 1M | Large context needs |
| `openai/gpt-4o` | 128K | General purpose |
| `openai/gpt-4o-mini` | 128K | Fast, cost-effective |

**Default Model**: `anthropic/claude-3.5-sonnet`

---

## 3. Agent Configuration

### 3.1 Mastra Agent Setup

```typescript
// src/mastra/agents/star-agent.ts

import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { openrouter } from "@mastra/ai-sdk";
import { searchReposTool, getRepoDetailsTool, getReadmeTool } from "./tools";

export const starAgent = new Agent({
  id: "star-agent",
  name: "Star Finder Agent",
  
  // Model configuration via OpenRouter
  model: openrouter("anthropic/claude-3.5-sonnet"),
  
  // System instructions
  instructions: `
You are Star Finder, an AI assistant that helps users find relevant GitHub 
repositories from their starred收藏.

## Your Role
- You have access to the user's starred GitHub repositories
- Your goal is to help users find repositories that match their needs
- Be conversational, helpful, and concise

## Available Data
You have access to the following information about each starred repository:
- Name and full name (owner/repo)
- Description
- Topics/Tags
- Primary programming language
- Star count
- Fork count
- Last updated date

## How to Help Users

1. **Understanding Needs**: Ask clarifying questions if needed
2. **Searching**: Use the repository search tool to find matches
3. **Filtering**: Apply filters like language, topic, or star count
4. **Recommending**: Provide clear recommendations with reasoning

## Tool Usage Guidelines

### search_repos Tool
- Use for initial search based on keywords, topics, or description
- Returns top matching repositories with basic info

### get_repo_details Tool
- Use when you need more info about a specific repository
- Returns extended metadata (license, issues, etc.)

### get_readme Tool
- ONLY use when user specifically asks for detailed analysis
- Or when comparing very similar repositories
- Remember: READMEs can be large, use judiciously

## Response Guidelines

1. Always explain your reasoning
2. Format repository recommendations clearly
3. Include relevant links
4. Mention why a repository matches the user's needs
5. Ask follow-up questions if needed
6. Admit when you can't find good matches

## Example Interactions

User: "I need a React component library"
→ Search for repos with "react component library"
→ Present top 3-5 matches with descriptions

User: "What's that React Native navigation library I starred?"
→ Search for "react native navigation"
→ Present matches with links

User: "Tell me more about that first repo"
→ Use get_repo_details for extended info
`,

  // Available tools
  tools: {
    searchReposTool,
    getRepoDetailsTool,
    getReadmeTool,
  },

  // Memory for conversation history
  memory: new Memory({
    // Keep last 20 messages for context
    messages: 20,
  }),
});
```

### 3.2 OpenRouter Integration

```typescript
// lib/services/openrouter.ts

import { createOpenRouter } from "@mastra/ai-sdk/openrouter";

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  siteUrl: process.env.OPENROUTER_SITE_URL,
  siteName: process.env.OPENROUTER_SITE_NAME,
});

// Model options
export const modelOptions = {
  default: "anthropic/claude-3.5-sonnet",
  alternatives: [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
    { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  ],
};
```

---

## 4. Tools Definition

### 4.1 Search Repositories Tool

```typescript
// mastra/tools/repo-tools.ts

import { z } from "zod";

export const searchReposTool = {
  id: "search_repos",
  name: "Search Repositories",
  description: `
Search the user's starred repositories by name, description, or topics.
Returns the most relevant matches with basic information.
`.trim(),

  inputSchema: z.object({
    query: z.string().describe("Search query - keywords, topic, or description"),
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe("Maximum number of results to return"),
    language: z
      .string()
      .optional()
      .describe("Filter by programming language"),
    minStars: z
      .number()
      .optional()
      .describe("Minimum star count"),
  }),

  execute: async ({ query, limit = 10, language, minStars }) => {
    // Implementation calls GitHub API service
    const repos = await githubApi.searchRepos({ query, limit, language, minStars });
    return {
      results: repos,
      total: repos.length,
      query,
    };
  },
};
```

### 4.2 Get Repository Details Tool

```typescript
export const getRepoDetailsTool = {
  id: "get_repo_details",
  name: "Get Repository Details",
  description: `
Get detailed information about a specific starred repository.
Includes license, issues count, branch info, and more.
`.trim(),

  inputSchema: z.object({
    owner: z.string().describe("Repository owner (user or organization)"),
    repo: z.string().describe("Repository name"),
  }),

  execute: async ({ owner, repo }) => {
    const details = await githubApi.getRepoDetails(owner, repo);
    return details;
  },
};
```

### 4.3 Get README Tool

```typescript
export const getReadmeTool = {
  id: "get_readme",
  name: "Get Repository README",
  description: `
Get the README content of a repository for detailed analysis.
Use sparingly - READMEs can be large and take time to process.
`.trim(),

  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name"),
    maxLength: z
      .number()
      .optional()
      .default(10000)
      .describe("Maximum characters to return"),
  }),

  execute: async ({ owner, repo, maxLength = 10000 }) => {
    const readme = await githubApi.getReadme(owner, repo);
    
    // Truncate if too long
    const truncated = readme.length > maxLength
      ? readme.slice(0, maxLength) + "\n\n... (truncated)"
      : readme;
    
    return {
      content: truncated,
      fullLength: readme.length,
      truncated: readme.length > maxLength,
      owner,
      repo,
    };
  },
};
```

---

## 5. Conversation Management

### 5.1 Thread/Conversation Management

```typescript
// lib/agent/agent-service.ts

interface ConversationThread {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  starredReposLoaded: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Agent service methods
class StarAgentService {
  // Create new conversation thread
  createThread(): ConversationThread;

  // Get existing thread
  getThread(threadId: string): ConversationThread | null;

  // Send message and get response (non-streaming)
  chat(threadId: string, message: string): Promise<{
    response: string;
    toolCalls?: ToolCall[];
  }>;

  // Send message and stream response
  streamChat(
    threadId: string,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<{
    response: string;
    toolCalls?: ToolCall[];
  }>;

  // Load starred repositories into context
  loadStarredRepos(threadId: string): Promise<void>;

  // Clear conversation history
  clearThread(threadId: string): void;
}
```

### 5.2 Context Loading

Before first message, load repository index into agent context:

```typescript
// Load repository index into agent
async function loadRepoIndex(agent: Agent, repos: GitHubRepo[]) {
  const repoIndex = repos.map((repo) => ({
    name: repo.full_name,
    description: repo.description,
    topics: repo.topics,
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updated: repo.updated_at,
  }));

  // Add to agent context
  const contextMessage = `
Here is an index of ${repos.length} starred repositories:

${JSON.stringify(repoIndex, null, 2)}

Use this index to answer questions about the user's starred repositories.
When more detail is needed, use the available tools to fetch additional information.
`;

  return contextMessage;
}
```

---

## 6. Response Streaming

### 6.1 Streaming Implementation

```typescript
// Stream response from agent
async function* streamChat(
  agent: Agent,
  message: string
): AsyncGenerator<string, void, unknown> {
  const result = await agent.stream({
    messages: [{ role: "user", content: message }],
  });

  for await (const chunk of result.text) {
    yield chunk;
  }
}

// Usage in React component
const handleStream = async () => {
  const generator = streamChat(agent, userMessage);
  
  for await (const chunk of generator) {
    setResponse((prev) => prev + chunk);
  }
};
```

### 6.2 UI Integration

Using existing components from `src/components/ai-elements/`:

```typescript
// Use existing Conversation and Message components
import { 
  Conversation, 
  ConversationContent,
  Message,
  MessageContent,
  MessageResponse,
  PromptInput 
} from "@/components/ai-elements";

// Stream response into MessageResponse
<MessageContent>
  <MessageResponse>
    {streamingText}
  </MessageResponse>
</MessageContent>
```

---

## 7. Error Handling

### 7.1 Error Types

| Error | Handling |
|-------|----------|
| `API_KEY_MISSING` | Show setup instructions |
| `MODEL_UNAVAILABLE` | Fall back to alternative model |
| `RATE_LIMITED` | Show message, offer retry after delay |
| `TOOL_EXECUTION_FAILED` | Show error, suggest alternatives |
| `CONTEXT_OVERFLOW` | Truncate history, reload context |

### 7.2 Graceful Degradation

```typescript
async function withFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    return await primaryFn();
  } catch (error) {
    if (isRetryableError(error)) {
      // Try fallback
      return await fallbackFn();
    }
    throw error;
  }
}
```

---

## 8. Acceptance Criteria

### 8.1 Functional Requirements

- [ ] Agent can search starred repositories by keyword
- [ ] Agent can get detailed info about specific repos
- [ ] Agent can fetch README on demand
- [ ] Streaming responses work smoothly
- [ ] Conversation history is maintained
- [ ] Model can be switched via settings

### 8.2 Performance Requirements

- [ ] First response appears within 3 seconds
- [ ] Streaming is smooth without jank
- [ ] Tool execution doesn't block UI

### 8.3 Quality Requirements

- [ ] Agent follows system instructions
- [ ] Responses are helpful and relevant
- [ ] Tool usage is appropriate (not excessive)
- [ ] Error messages are user-friendly

---

## 9. File Checklist

```
src/
├── mastra/
│   ├── agents/
│   │   └── star-agent.ts       # Main agent definition
│   ├── tools/
│   │   ├── repo-tools.ts       # Repository tools
│   │   └── index.ts           # Tools export
│   └── index.ts               # Mastra instance
│
├── lib/
│   ├── agent/
│   │   ├── agent-service.ts    # Agent service wrapper
│   │   └── instructions.ts     # System prompts
│   │
│   └── services/
│       └── openrouter.ts      # OpenRouter config
│
├── hooks/
│   └── use-agent.ts           # React hook for agent
│
└── stores/
    └── chat-store.ts          # Chat state management
```

---

## 10. Dependencies

### 10.1 Required Packages

Already installed via package.json:
- `@mastra/core`: Agent framework
- `@mastra/ai-sdk`: AI SDK integration
- `@mastra/memory`: Conversation memory

### 10.2 Environment Variables

```env
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=Star Finder
```

---

## 11. Testing Strategy

### 11.1 Manual Testing

1. Test basic search queries
2. Test tool execution (details, README)
3. Test streaming response
4. Test error scenarios
5. Test with large repository list

### 11.2 Agent Quality Metrics

- Relevance of search results
- Appropriateness of tool usage
- Response helpfulness score
- Conversation continuity
