/**
 * Star Agent Handler
 *
 * Handles requests for the Star Agent (GitHub stars recommendation agent)
 */

import { convertToModelMessages, streamText, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import type { GitHubRepo } from "@/lib/github/api";
import { createStarAgent, formatReposForInitialContext } from "@/agents/star";
import { getModel } from "./model";
import { getRepos } from "./cache";
import type { ChatRequestBody } from "./types";

/**
 * Handle Star Agent requests
 * @param requestId Request tracking ID
 * @param body Request body containing messages and context
 * @returns Streaming response
 */
export async function handleStarAgent(
  requestId: string,
  body: ChatRequestBody
): Promise<Response> {
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
  console.log(
    `[${requestId}] Using model: ${supportsReasoning ? "with reasoning" : "standard"}`
  );

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
