import { tool, convertToModelMessages, streamText, stepCountIs } from "ai";
import type { LanguageModelUsage, UIMessage } from "ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { z } from "zod";
import {
  getRepositoryStats,
  getTopics,
  getLanguages,
  searchRepositories,
  formatReposForContext,
  getRepositoryReadme

} from "@/lib/github/tools";
import type { GitHubRepo } from "@/lib/github/tools";
import type { GitHubRepo as RepoType } from "@/lib/github/api";

// Custom metadata type for messages
export interface ChatMessage extends UIMessage<{ totalUsage: LanguageModelUsage }> {}

// Provider configuration
const PROVIDER = process.env.AI_PROVIDER || "openai";

// OpenAI configuration
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// NVIDIA NIM configuration
const NIM_BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NIM_API_KEY = process.env.NIM_API_KEY;
const NIM_MODEL = process.env.NIM_MODEL || "deepseek-ai/deepseek-r1";

// Create NVIDIA NIM provider
function getNvidiaProvider() {
  if (!NIM_API_KEY) {
    throw new Error("NIM_API_KEY environment variable is not set");
  }

  const isMiniMax = NIM_MODEL.includes("minimax");

  return createOpenAICompatible({
    name: "nim",
    baseURL: NIM_BASE_URL,
    headers: {
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    // MiniMax 需要 reasoning_split 来分离思考内容
    ...(isMiniMax && {
      extraBody: {
        reasoning_split: true,
      },
    }),
  });
}

// Get the model based on provider
// Returns model instance and whether it supports reasoning
function getModel() {
  const supportsReasoning
    = PROVIDER === "nvidia"
      ? NIM_MODEL.includes("r1") || NIM_MODEL.includes("reasoning")
      : OPENAI_MODEL.includes("o1") || OPENAI_MODEL.includes("o3");

  if (PROVIDER === "nvidia") {
    const nim = getNvidiaProvider();
    return {
      model: nim.chatModel(NIM_MODEL),
      supportsReasoning,
    };
  }

  // Default to OpenAI
  return {
    model: openai(OPENAI_MODEL),
    supportsReasoning,
  };
}

export const runtime = "nodejs";
export const maxDuration = 60;

// In-memory cache for repositories
const repoCache = new Map<string, { repos: RepoType[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

async function getRepos(username: string): Promise<GitHubRepo[]> {
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

/// 将仓库格式化为简洁的上下文信息（用于初始提示词）
function formatReposForInitialContext(repos: GitHubRepo[]): string {
  return repos
    .map((repo) => {
      const parts = [
        repo.full_name,
        repo.description || "无描述",
        `⭐${repo.stargazers_count}`,
        repo.language || "",
        repo.topics.join(", "),
      ];
      return parts.join(" | ");
    })
    .join("\n");
}

// System prompt template - repos will be injected dynamically
function SYSTEM_PROMPT_TEMPLATE(username: string, repoCount: number, reposContext: string): string {
  return `
你是一个热情且能力较强的助手，擅长使用工具帮助用户解决问题，遇到非常模糊的问题会主动询问用户。

# 用户信息
- GitHub 用户名: ${username}
- 仓库总数: ${repoCount} 个

# 用户仓库列表（完整）
以下是用户的完整仓库列表，请先阅读这些信息，这对你回答问题非常重要：

${reposContext}

# 工作职责

- 获取他们的星标仓库列表，并帮助他们找到想要的内容
- 通过提问澄清需求，缩小搜索范围
- 以清晰有条理的方式展示相关的仓库信息

# 约束

- 当你找到匹配的仓库时，使用 displayRepositories 工具展示，不可直接以文本的形式呈现。

# 注意事项

- 如果用户未提供用户名，询问用户的 GitHub 用户名。
- 始终保持友好、对话式的沟通风格。以清晰、有组织的方式呈现仓库信息。
`;
}

// Zod schemas for tools
const SearchSchema = z.object({
  query: z.string().optional(),
  language: z.string().optional(),
  topic: z.string().optional(),
  minStars: z.number().optional(),
  maxStars: z.number().optional(),
  sortBy: z.enum(["stars", "updated", "name"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  limit: z.number().optional(),
});

const GetRepoSchema = z.object({
  fullName: z.string(),
});

const GetReadmeSchema = z.object({
  fullName: z.string(),
});

// Schema for displaying repositories as UI
const DisplayReposSchema = z.object({
  repos: z.array(z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    description: z.string().nullable(),
    html_url: z.string(),
    stargazers_count: z.number(),
    forks_count: z.number(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    updated_at: z.string(),
    owner: z.object({
      login: z.string(),
      avatar_url: z.string(),
      html_url: z.string(),
    }),
    license: z.object({ spdx_id: z.string() }).nullable(),
    watchers_count: z.number(),
    visibility: z.string(),
  })),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/chat - Request received`);

  try {
    const body = await request.json();
    const { messages, username } = body;

    console.log(`[${requestId}] Username: ${username}, Messages: ${messages?.length || 0}`);

    if (!username) {
      return NextResponse.json(
        { error: "GitHub username is required" },
        { status: 400 }
      );
    }

    // Get repositories - prefer from request body, otherwise fetch from API
    let repos: GitHubRepo[];
    if (body.repos && Array.isArray(body.repos) && body.repos.length > 0) {
      // Use repos provided by client (already fetched)
      repos = body.repos;
      console.log(`[${requestId}] Using ${repos.length} repos from client`);
    } else {
      // Fallback: fetch from API
      console.log(`[${requestId}] Fetching repos for user: ${username}`);
      repos = await getRepos(username);
      console.log(`[${requestId}] Fetched ${repos.length} repos from API`);
    }

    if (repos.length === 0) {
      return NextResponse.json(
        { error: "No starred repositories found for this user" },
        { status: 404 }
      );
    }

    // Define tools using the `tool` function
    const tools = {
      searchRepositories: tool({
        description:
          "Search and filter repositories by query, language, topic, or star count",
        inputSchema: SearchSchema,
        execute: async (params: z.infer<typeof SearchSchema>) => {
          const startTime = Date.now();
          console.log(`[${requestId}] Tool: searchRepositories, params:`, params);
          const result = await searchRepositories(repos, params || {});
          console.log(`[${requestId}] Tool: searchRepositories, found ${result.repos.length} repos`);
          return {
            repos: result.repos,
            totalCount: result.totalCount,
            formatted: formatReposForContext(result.repos),
            availableLanguages: result.availableLanguages,
            availableTopics: result.availableTopics.slice(0, 20),
            __duration: Date.now() - startTime,
          };
        },
      }),
      getRepositoryByName: tool({
        description: "获取某个项目的 README 文档内容，以便更好地了解项目",
        inputSchema: GetReadmeSchema,
        execute: async ({ fullName }: z.infer<typeof GetReadmeSchema>) => {
          const startTime = Date.now();
          console.log(`[${requestId}] Tool: getRepositoryReadme, fullName: ${fullName}`);
          const result = await getRepositoryReadme(repos, fullName);
          if (!result) {
            return { error: `Repository '${fullName}' not found or README unavailable`, __duration: Date.now() - startTime };
          }
          console.log(`${fullName} README: \n ${result}`);

          return {
            readme: result.readme,
            html_url: result.html_url,
            __duration: Date.now() - startTime,
          };
        },
      }),
      // Generative UI tool - displays repositories as UI cards with progressive loading
      displayRepositories: tool({
        description:
          "当你想让用户看到你选择的Github仓库时，使用这个工具来展示，这个工具会将你选择的仓库以 UI 的形式呈现给用户，不可直接使用文本的形式呈现",
        inputSchema: DisplayReposSchema,
        // Use async generator to yield progressive tool results
        async* execute(params: z.infer<typeof DisplayReposSchema>) {
          const startTime = Date.now();
          const repos = params.repos;
          const total = repos.length;
          const batchSize = 3;

          console.log(`[${requestId}] Tool: displayRepositories, total: ${total}`);

          // Step 1: Initial loading state
          const loadingState = {
            state: "loading" as const,
            repos: [],
            loaded: 0,
            total,
            message: `正在加载 ${total} 个仓库...`,
          };
          console.log(`[${requestId}] Tool: YIELD loading state`);
          yield loadingState;

          // Step 2: Yield repos in batches for progressive loading
          for (let i = 0; i < total; i += batchSize) {
            const batch = repos.slice(i, i + batchSize);
            const loaded = Math.min(i + batchSize, total);

            const partialState = {
              state: "partial" as const,
              repos: batch,
              loaded,
              total,
              message: `已加载 ${loaded}/${total} 个仓库`,
            };
            console.log(`[${requestId}] Tool: YIELD partial state (${loaded}/${total})`);
            yield partialState;

            // Small delay for visual effect (can be removed in production)
            if (i + batchSize < total) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }

          // Step 3: Final complete state - MUST yield, not return!
          // Note: 'return' does NOT trigger tool-output-available event!
          const completeState = {
            state: "complete" as const,
            repos,
            loaded: total,
            total,
            message: `已显示全部 ${total} 个仓库`,
            __duration: Date.now() - startTime,
          };
          console.log(`[${requestId}] Tool: YIELD complete state (final)`);
          yield completeState;

          console.log(`[${requestId}] Tool: execute generator finished`);
        },
      }),
    };

    // Convert messages to model format
    const modelMessages = await convertToModelMessages(messages);

    // Get model based on provider
    const { model, supportsReasoning } = getModel();
    console.log(`[${requestId}] Using model: ${supportsReasoning ? "with reasoning" : "standard"}, provider: ${PROVIDER}`);

    // Build streamText options
    const reposContext = formatReposForInitialContext(repos);
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE(username, repos.length, reposContext);

    const streamOptions: Parameters<typeof streamText>[0] = {
      model,
      tools,
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: stepCountIs(100),
    };

    // Add reasoning support for models that support it
    if (supportsReasoning) {
      Object.assign(streamOptions, {
        providerOptions: {
          reasoningSummary: "detailed" as const,
        },
      });
    }

    // Use streamText for streaming response
    const result = streamText(streamOptions);

    // Return streaming response with token usage metadata
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // Send total usage when generation is finished
        if (part.type === "finish") {
          return { totalUsage: part.totalUsage };
        }
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const message
      = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Chat error: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  const modelInfo = PROVIDER === "nvidia"
    ? { provider: "nvidia", model: NIM_MODEL, baseUrl: NIM_BASE_URL }
    : { provider: "openai", model: OPENAI_MODEL };

  return NextResponse.json({
    status: "ok",
    message: "Chat API is running.",
    model: modelInfo,
  });
}
