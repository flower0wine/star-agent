/**
 * Chat API Route
 *
 * Unified API route that handles all agent requests.
 * Uses agentId to dispatch to the appropriate agent.
 *
 * Request body:
 * {
 *   messages: UIMessage[],
 *   agentId?: string,      // Defaults to "star"
 *   context?: object,      // Additional context for the agent
 *   // Legacy (for backward compatibility with star agent):
 *   username?: string,
 *   repos?: GitHubRepo[]
 * }
 */

import { convertToModelMessages, streamText, stepCountIs } from "ai";
import type { LanguageModelUsage, UIMessage } from "ai";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { GitHubRepo } from "@/lib/github/api";
import { createStarAgent, formatReposForInitialContext } from "@/agents/star";

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

// In-memory cache for repositories (star agent only)
const repoCache = new Map<string, { repos: GitHubRepo[]; timestamp: number }>();
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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/chat - Request received`);

  try {
    const body = await request.json();

    // Extract agentId (defaults to "star" for backward compatibility)
    const agentId = body.agentId || "star";
    const { messages } = body;

    console.log(`[${requestId}] Agent: ${agentId}, Messages: ${messages?.length || 0}`);

    // Handle Star Agent
    if (agentId === "star") {
      return handleStarAgent(requestId, body);
    }

    // Unknown agent
    return NextResponse.json(
      { error: `Agent "${agentId}" not found` },
      { status: 404 }
    );
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

/**
 * Handle Star Agent requests
 * This is extracted to maintain exact original behavior
 */
async function handleStarAgent(requestId: string, body: {
  messages: UIMessage[];
  username?: string;
  repos?: GitHubRepo[];
  context?: {
    username?: string;
    repos?: GitHubRepo[];
  };
}): Promise<Response> {
  // Support both legacy top-level fields and new context-based fields
  const username = body.username || body.context?.username;
  const repos = body.repos || body.context?.repos;

  console.log(`[${requestId}] Username: ${username}, Messages: ${body.messages?.length || 0}`);

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username is required" },
      { status: 400 }
    );
  }

  // Get repositories - prefer from request body, otherwise fetch from API
  let finalRepos: GitHubRepo[];
  if (repos && Array.isArray(repos) && repos.length > 0) {
    // Use repos provided by client (already fetched)
    finalRepos = repos;
    console.log(`[${requestId}] Using ${finalRepos.length} repos from client`);
  } else {
    // Fallback: fetch from API
    console.log(`[${requestId}] Fetching repos for user: ${username}`);
    finalRepos = await getRepos(username);
    console.log(`[${requestId}] Fetched ${finalRepos.length} repos from API`);
  }

  if (finalRepos.length === 0) {
    return NextResponse.json(
      { error: "No starred repositories found for this user" },
      { status: 404 }
    );
  }

  // Create Star Agent with repos context
  const starAgent = createStarAgent(finalRepos);

  // Get tools and prompt from agent
  const tools = starAgent.getTools({});
  const reposContext = formatReposForInitialContext(finalRepos);
  const systemPrompt = starAgent.getSystemPrompt({
    username,
    repos: finalRepos,
    reposContext,
  });

  // Convert messages to model format
  const modelMessages = await convertToModelMessages(body.messages);

  // Get model based on provider
  const { model, supportsReasoning } = getModel();
  console.log(`[${requestId}] Using model: ${supportsReasoning ? "with reasoning" : "standard"}, provider: ${PROVIDER}`);

  // Build streamText options
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
