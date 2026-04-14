/**
 * Patent Agent Handler
 */

import { convertToModelMessages, stepCountIs } from "ai";
import dayjs from "dayjs";
import { resolveAgentRuntime } from "@/lib/agents/base/runtime-resolver";
import { buildChatMessageMetadata } from "@/lib/chat/message-metadata";
import { observedStreamText } from "@/lib/observability/ai-sdk";
import type { StreamTextOptions } from "@/lib/observability/ai-sdk";
import { getModel } from "./model";
import type { AgentConfigPayload, ChatRequestBody } from "./types";

export async function handlePatentAgent(
  requestId: string,
  body: ChatRequestBody,
  abortSignal?: AbortSignal,
): Promise<Response> {
  const generationStartedAt = dayjs().toISOString();
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

  const streamOptions: StreamTextOptions = {
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

  const result = observedStreamText(streamOptions, {
    functionId: "chat.patent.stream",
    requestId,
    agentId: "patent",
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        const generationFinishedAt = dayjs().toISOString();
        return buildChatMessageMetadata({
          totalUsage: part.totalUsage,
          startedAt: generationStartedAt,
          finishedAt: generationFinishedAt,
        });
      }
    },
  });
}
