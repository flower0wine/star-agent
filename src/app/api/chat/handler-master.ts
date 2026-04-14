/**
 * Master Agent Handler
 *
 * Handles requests for the Master Agent (orchestrates sub-agents)
 *
 * KEY CHANGE: Now uses multi-stream response to support parallel sub-agent execution.
 */

import { convertToModelMessages, stepCountIs } from "ai";
import { NextResponse } from "next/server";
import type { GitHubRepo } from "@/lib/github/api";
import { resolveAgentRuntime } from "@/lib/agents/base/runtime-resolver";
import { observedStreamText } from "@/lib/observability/ai-sdk";
import type { StreamTextOptions } from "@/lib/observability/ai-sdk";
import { getModel } from "./model";
import { getRepos } from "./cache";
import type { ChatRequestBody, AgentConfigPayload } from "./types";
import { createMultiStreamResponse } from "@/lib/agents/multi-stream";

/**
 * Handle Master Agent requests
 * @param requestId Request tracking ID
 * @param body Request body containing messages and context
 * @returns Streaming response
 */
export async function handleMasterAgent(
  requestId: string,
  body: ChatRequestBody,
): Promise<Response> {
  // Support both legacy top-level fields and new context-based fields
  const username = body.username || body.context?.username;
  const repos = body.repos || body.context?.repos;

  if (!username) {
    return NextResponse.json(
      { error: "GitHub username is required" },
      { status: 400 },
    );
  }

  // Get repositories - prefer from request body, otherwise fetch from API
  let finalRepos: GitHubRepo[];
  if (repos && Array.isArray(repos) && repos.length > 0) {
    // Use repos provided by client (already fetched)
    finalRepos = repos;
  } else {
    finalRepos = await getRepos(username);
  }

  if (finalRepos.length === 0) {
    return NextResponse.json(
      { error: "No starred repositories found for this user" },
      { status: 404 },
    );
  }

  // Get model based on provider
  const modelInstance = await getModel(body.modelConfig);

  // Extract agent configuration
  const agentConfig: AgentConfigPayload = body.agentConfig || {};
  const { tools, systemPrompt } = resolveAgentRuntime({
    agentId: "master",
    requestId,
    repos: finalRepos,
    username,
    agentConfig,
  });

  // Convert messages to model format
  console.log(`[${requestId}] Converting messages...`);
  const modelMessages = await convertToModelMessages(body.messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });

  // Build streamText options
  const streamOptions: StreamTextOptions = {
    model: modelInstance.model,
    tools,
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(100),
    experimental_onToolCallStart: ({ toolCall }) => {
      console.log(`[${requestId}] Master tool started: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
      });
    },
    experimental_onToolCallFinish: ({ toolCall, durationMs, success, error }) => {
      console.log(`[${requestId}] Master tool finished: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        durationMs,
        success,
        error: error ? String(error) : undefined,
      });
    },
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
  const masterStream = observedStreamText(streamOptions, {
    functionId: "chat.master.stream",
    requestId,
    agentId: "master",
    metadata: {
      username,
      reposCount: finalRepos.length,
    },
  });

  // Prepare master config for resumption
  const masterConfig = {
    model: modelInstance.model,
    tools,
    system: systemPrompt,
    initialModelMessages: modelMessages,
    providerOptions: streamOptions.providerOptions,
  };

  // Return multi-stream response (merges master + sub-agent streams)
  const response = await createMultiStreamResponse(
    masterStream,
    requestId,
    masterConfig,
  );

  return response;
}
