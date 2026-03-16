import { tool, convertToModelMessages, streamText, stepCountIs } from "ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { z } from "zod";
import {
  getRepositoryByName,
  getRepositoryStats,
  getTopics,
  getLanguages,
  searchRepositories,
  formatReposForContext

} from "@/lib/github/tools";
import type { GitHubRepo } from "@/lib/github/tools";
import type { GitHubRepo as RepoType } from "@/lib/github/api";

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

// System prompt
const SYSTEM_PROMPT = `
你是一个乐于助人的 AI 助手，帮助用户从他们的 GitHub 星标（starred）仓库中查找项目。

# 工作职责

- 获取他们的星标仓库列表，并帮助他们找到想要的内容
- 通过提问澄清需求，缩小搜索范围
- 以清晰有条理的方式展示相关的仓库信息
- 按关键词、编程语言、主题、星标数量搜索仓库
- 通过仓库名称获取详细信息
- 获取用户星标相关的统计数据
- 展示用户的星标仓库列表

# 约束

- 当你找到匹配的仓库时，使用 displayRepositories 工具展示，不可直接以文本的形式呈现。

# 注意事项

- 如果用户未提供用户名，询问用户的 GitHub 用户名。
- 始终保持友好、对话式的沟通风格。以清晰、有组织的方式呈现仓库信息。
`;

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
          console.log(`[${requestId}] Tool: searchRepositories, params:`, params);
          const result = await searchRepositories(repos, params || {});
          console.log(`[${requestId}] Tool: searchRepositories, found ${result.repos.length} repos`);
          return {
            repos: result.repos,
            totalCount: result.totalCount,
            formatted: formatReposForContext(result.repos),
            availableLanguages: result.availableLanguages,
            availableTopics: result.availableTopics.slice(0, 20),
          };
        },
      }),
      getRepositoryByName: tool({
        description: "Get detailed information about a specific repository",
        inputSchema: GetRepoSchema,
        execute: async ({ fullName }: z.infer<typeof GetRepoSchema>) => {
          console.log(`[${requestId}] Tool: getRepositoryByName, fullName: ${fullName}`);
          const repo = await getRepositoryByName(repos, fullName);
          if (!repo) {
            return { error: `Repository '${fullName}' not found` };
          }
          return {
            repo,
            formatted: formatReposForContext([repo]),
          };
        },
      }),
      getLanguages: tool({
        description:
          "Get all unique programming languages from the repositories",
        inputSchema: z.object({}),
        execute: async () => {
          console.log(`[${requestId}] Tool: getLanguages`);
          return { languages: getLanguages(repos) };
        },
      }),
      getTopics: tool({
        description: "Get all unique topics/tags from the repositories",
        inputSchema: z.object({}),
        execute: async () => {
          console.log(`[${requestId}] Tool: getTopics`);
          return { topics: getTopics(repos).slice(0, 50) };
        },
      }),
      getStats: tool({
        description: "Get statistics about the user's starred repositories",
        inputSchema: z.object({}),
        execute: async () => {
          console.log(`[${requestId}] Tool: getStats`);
          return getRepositoryStats(repos);
        },
      }),
      // Generative UI tool - displays repositories as UI cards with progressive loading
      displayRepositories: tool({
        description:
          "当你想让用户看到你选择的Github仓库时，使用这个工具来展示，这个工具会将你选择的仓库以 UI 的形式呈现给用户，不可直接使用文本的形式呈现",
        inputSchema: DisplayReposSchema,
        // Use async generator to yield progressive tool results
        async* execute(params: z.infer<typeof DisplayReposSchema>) {
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
    const streamOptions: Parameters<typeof streamText>[0] = {
      model,
      tools,
      system: `${SYSTEM_PROMPT}\n\nThe user's GitHub username is "${username}". They have ${repos.length} starred repositories. When helping them search, use the tools to find relevant matches.`,
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

    // Return streaming response
    return result.toUIMessageStreamResponse();
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
