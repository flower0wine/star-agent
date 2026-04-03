/**
 * Patent Agent Handler
 */

import { convertToModelMessages, stepCountIs, streamText } from "ai";

import { createPatentAgent } from "@/agents/patent";
import { resolvePatentRuntimeConfig } from "@/agents/patent/static-config";

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

  const runtimeConfig = resolvePatentRuntimeConfig(agentConfig.staticParams, agentConfig.customParams);
  const patentAgent = createPatentAgent(runtimeConfig);

  let tools = patentAgent.getTools({});
  let systemPrompt = patentAgent.getSystemPrompt({});

  if (Array.isArray(agentConfig.enabledTools)) {
    const enabledSet = new Set(agentConfig.enabledTools);
    tools = Object.fromEntries(
      Object.entries(tools).filter(([key]) => enabledSet.has(key))
    );
  }

  if (agentConfig.additionalSystemPrompt) {
    systemPrompt = `${systemPrompt}\n\n## 用户附加指令\n${agentConfig.additionalSystemPrompt}`;
  }

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

