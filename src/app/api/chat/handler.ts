/**
 * Star Agent Handler
 *
 * Handles requests for the Star Agent (GitHub stars recommendation agent)
 */

import { convertToModelMessages, streamText, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { NextResponse } from "next/server";
import type { GitHubRepo } from "@/lib/github/api";
import { formatReposForInitialContext } from "@/lib/github/utils";
import { createStarAgent } from "@/agents/star";
import { getModel } from "./model";
import { getRepos } from "./cache";
import type { ChatRequestBody, AgentConfigPayload } from "./types";
import { getCoreTools } from "@/lib/agents/tool-registry";
import { buildChatMessageMetadata } from "@/lib/chat/message-metadata";

/**
 * Handle Star Agent requests
 * @param requestId Request tracking ID
 * @param body Request body containing messages and context
 * @param abortSignal Signal to abort the request
 * @returns Streaming response
 */
export async function handleStarAgent(
  requestId: string,
  body: ChatRequestBody,
  abortSignal?: AbortSignal
): Promise<Response> {
  const generationStartedAt = new Date().toISOString();

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
    // Fallback: fetch from API
    finalRepos = await getRepos(username);
  }

  if (finalRepos.length === 0) {
    return NextResponse.json(
      { error: "No starred repositories found for this user" },
      { status: 404 }
    );
  }

  // Extract agent configuration
  const agentConfig: AgentConfigPayload = body.agentConfig || {};

  // Create Star Agent with repos context
  const starAgent = createStarAgent(finalRepos);

  // Get tools and prompt from agent
  let tools = starAgent.getTools({});
  const reposContext = formatReposForInitialContext(finalRepos);
  let systemPrompt = starAgent.getSystemPrompt({
    username,
    repos: finalRepos,
    reposContext,
  });

  // Apply agent configuration: filter tools based on enabledTools
  if (agentConfig.enabledTools && agentConfig.enabledTools.length > 0) {
    const coreTools = getCoreTools("star");
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
  // ignoreIncompleteToolCalls: true to handle cases where user stops mid-tool-call
  const modelMessages = await convertToModelMessages(body.messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });

  // Get model based on provider
  const { model, supportsReasoning } = await getModel(body.modelConfig);

  // Build streamText options
  const streamOptions: Parameters<typeof streamText>[0] = {
    model,
    tools,
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(100),
    abortSignal,
    // 添加工具调用生命周期回调，用于记录工具执行时间
    experimental_onToolCallStart: ({ toolCall }) => {
      console.log(`[${requestId}] Tool started: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
      });
    },
    experimental_onToolCallFinish: ({ toolCall, durationMs, success, error }) => {
      console.log(`[${requestId}] Tool finished: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        durationMs,
        success,
        error: error ? String(error) : undefined,
      });
    },
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
        const generationFinishedAt = new Date().toISOString();
        const metadata = buildChatMessageMetadata({
          totalUsage: part.totalUsage,
          startedAt: generationStartedAt,
          finishedAt: generationFinishedAt,
        });

        console.log(`[${requestId}] Message metrics:`, metadata);
        return metadata;
      }
    },
  });
}

