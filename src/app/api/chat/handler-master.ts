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
import type { ChatRequestBody, AgentConfigPayload } from "./types";
import { createMultiStreamResponse } from "@/lib/agents/multi-stream";
import { getCoreTools } from "@/lib/agents/tool-registry";

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
  } else {
    finalRepos = await getRepos(username);
  }

  if (finalRepos.length === 0) {
    return NextResponse.json(
      { error: "No starred repositories found for this user" },
      { status: 404 }
    );
  }

  // Get model based on provider
  const modelInstance = await getModel(body.modelConfig);

  // Extract agent configuration
  const agentConfig: AgentConfigPayload = body.agentConfig || {};

  // Create Master Agent with repos and model
  const masterAgent = createMasterAgent(finalRepos, username);

  // Get tools and system prompt from agent
  let tools = masterAgent.getTools({ requestId });
  let systemPrompt = masterAgent.getSystemPrompt({
    username,
    repos: finalRepos,
  });

  // Apply agent configuration: filter tools based on enabledTools
  if (agentConfig.enabledTools && agentConfig.enabledTools.length > 0) {
    const coreTools = getCoreTools("master");
    const enabledSet = new Set([...agentConfig.enabledTools, ...coreTools]);
    tools = Object.fromEntries(
      Object.entries(tools).filter(([key]) => enabledSet.has(key))
    );
  }

  // Apply agent configuration: append additional system prompt
  if (agentConfig.additionalSystemPrompt) {
    systemPrompt = `${systemPrompt}\n\n## 用户附加指令\n${agentConfig.additionalSystemPrompt}`;
  }

  // Convert messages to model format
  console.log(`[${requestId}] Converting messages...`);
  const modelMessages = await convertToModelMessages(body.messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });

  // Build streamText options
  const streamOptions: Parameters<typeof streamText>[0] = {
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
  const masterStream = streamText(streamOptions);

  // Prepare master config for resumption
  const masterConfig = {
    model: modelInstance.model,
    tools,
    system: systemPrompt,
    initialMessages: body.messages,
  };

  // Return multi-stream response (merges master + sub-agent streams)
  const response = await createMultiStreamResponse(
    masterStream,
    requestId,
    masterConfig,
  );

  return response;
}

