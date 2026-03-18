/**
 * Master Agent Handler
 *
 * Handles requests for the Master Agent (orchestrates sub-agents)
 *
 * KEY CHANGE: Now uses multi-stream response to support parallel sub-agent execution.
 */

import { convertToModelMessages, streamText, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import type { GitHubRepo } from "@/lib/github/api";
import { createMasterAgent } from "@/agents/master";
import { getModel } from "./model";
import { getRepos } from "./cache";
import type { ChatRequestBody } from "./types";
import { createMultiStreamResponse } from "@/lib/agents/multi-stream";

/**
 * Handle Master Agent requests
 * @param requestId Request tracking ID
 * @param body Request body containing messages and context
 * @returns Streaming response
 */
export async function handleMasterAgent(
  requestId: string,
  body: ChatRequestBody
): Promise<Response> {
  // Support both legacy top-level fields and new context-based fields
  const username = body.username || body.context?.username;
  const repos = body.repos || body.context?.repos;

  console.log(`[${requestId}] Master Agent - Username: ${username}, Messages: ${body.messages?.length || 0}`);

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

  // Get model based on provider
  const modelInstance = getModel();
  console.log(
    `[${requestId}] Using model: ${modelInstance.supportsReasoning ? "with reasoning" : "standard"}`
  );

  // Create Master Agent with repos and model
  const masterAgent = createMasterAgent(finalRepos, modelInstance, username);

  // Get tools and system prompt from agent
  const tools = masterAgent.getTools({});
  const systemPrompt = masterAgent.getSystemPrompt({
    username,
    repos: finalRepos,
  });

  console.log(`[${requestId}] Tools created: ${Object.keys(tools).join(", ")}`);
  console.log(`[${requestId}] System prompt length: ${systemPrompt.length}`);

  // Convert messages to model format
  // ignoreIncompleteToolCalls: true to handle cases where user stops mid-tool-call
  console.log(`[${requestId}] Converting messages...`);
  const modelMessages = await convertToModelMessages(body.messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });
  console.log(`[${requestId}] Messages converted, count: ${modelMessages.length}`);

  // Build streamText options
  const streamOptions: Parameters<typeof streamText>[0] = {
    model: modelInstance.model,
    tools,
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(100),
  };

  // Add reasoning support for models that support it
  if (modelInstance.supportsReasoning) {
    Object.assign(streamOptions, {
      providerOptions: {
        reasoningSummary: "detailed" as const,
      },
    });
  }

  // Use streamText for streaming response
  console.log(`[${requestId}] Creating streamText...`);
  const masterStream = streamText(streamOptions);
  console.log(`[${requestId}] streamText created, calling createMultiStreamResponse...`);

  // Return multi-stream response (merges master + sub-agent streams)
  const response = await createMultiStreamResponse(masterStream, requestId);
  console.log(`[${requestId}] MultiStream response created, status: ${response.status}`);

  return response;
}
