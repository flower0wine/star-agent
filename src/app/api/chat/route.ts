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

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getModelInfo } from "./model";
import { handleStarAgent } from "./handler";
import { handleMasterAgent } from "./handler-master";
import { handlePatentAgent } from "./handler-patent";
import type { ChatRequestBody } from "./types";

// Re-export types for external usage
export type { ChatMessage } from "./types";

export const runtime = "nodejs";
export const maxDuration = 60;

type AgentHandler = (requestId: string, body: ChatRequestBody, signal: AbortSignal) => Promise<Response>;

const AGENT_HANDLER_MAP: Record<string, AgentHandler> = {
  star: async (requestId, body, signal) => handleStarAgent(requestId, body, signal),
  master: async (requestId, body) => handleMasterAgent(requestId, body),
  patent: async (requestId, body, signal) => handlePatentAgent(requestId, body, signal),
};

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] POST /api/chat - Request received`);

  try {
    const body = await request.json();

    // Extract agentId (defaults to "star" for backward compatibility)
    const agentId = body.agentId || "star";
    const { messages } = body;

    console.log(`[${requestId}] Agent: ${agentId}, Messages: ${messages?.length || 0}`);

    const handler = AGENT_HANDLER_MAP[agentId];
    if (handler) {
      const response = await handler(requestId, body, request.signal);
      return response;
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

export async function GET() {
  const modelInfo = getModelInfo();

  return NextResponse.json({
    status: "ok",
    message: "Chat API is running.",
    model: modelInfo,
  });
}

