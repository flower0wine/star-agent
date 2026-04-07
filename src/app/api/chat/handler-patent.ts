/**
 * Patent Agent Handler
 */

import { convertToModelMessages, stepCountIs, streamText } from "ai";

import { resolveAgentRuntime } from "@/lib/agents/base/runtime-resolver";

import { getModel } from "./model";
import { buildChatMessageMetadata } from "@/lib/chat/message-metadata";
import type { AgentConfigPayload, ChatRequestBody } from "./types";

export async function handlePatentAgent(
  requestId: string,
  body: ChatRequestBody,
  abortSignal?: AbortSignal
): Promise<Response> {
  const generationStartedAt = new Date().toISOString();
  const agentConfig: AgentConfigPayload = body.agentConfig || {};
  const { tools, systemPrompt } = resolveAgentRuntime({
    agentId: "patent",
    requestId,
    agentConfig,
  });

  const modelMessages = await convertToModelMessages(body.messages, {
    tools,
    ignoreIncompleteToolCalls: true,
  });

  const { model, supportsReasoning } = await getModel(body.modelConfig);

  const streamOptions: Parameters<typeof streamText>[0] = {
    model,
    tools,
    system: systemPrompt,
    messages: modelMessages,
    stopWhen: stepCountIs(100),
    abortSignal,
    experimental_onToolCallStart: ({ toolCall }) => {
      console.log(`[${requestId}] Patent tool started: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
      });
    },
    experimental_onToolCallFinish: ({ toolCall, durationMs, success, error }) => {
      console.log(`[${requestId}] Patent tool finished: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        durationMs,
        success,
        error: error ? String(error) : undefined,
      });
    },
  };

  if (supportsReasoning) {
    Object.assign(streamOptions, {
      providerOptions: {
        reasoningSummary: "detailed" as const,
      },
    });
  }

  const result = streamText(streamOptions);

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        const generationFinishedAt = new Date().toISOString();
        return buildChatMessageMetadata({
          totalUsage: part.totalUsage,
          startedAt: generationStartedAt,
          finishedAt: generationFinishedAt,
        });
      }
    },
  });
}

