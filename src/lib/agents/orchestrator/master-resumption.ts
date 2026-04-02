/**
 * Master Agent Resumption
 *
 * Handles resuming master agent execution with sub-agent results.
 */

import { streamText } from "ai";
import type { ModelMessage } from "ai";
import type { SubAgentResult } from "./types";

/**
 * Create resumption message from sub-agent results
 *
 * This message will be appended to the conversation to resume the master agent.
 */
export function createResumptionMessage(
  results: SubAgentResult[],
  cycleNumber: number
): ModelMessage {
  const content = formatResultsAsMessage(results, cycleNumber);

  return {
    role: "user",
    content,
  };
}

/**
 * Format sub-agent results as a message
 */
function formatResultsAsMessage(
  results: SubAgentResult[],
  cycleNumber: number
): string {
  if (results.length === 0) {
    return `[子 Agent 结果] 第 ${cycleNumber} 轮：所有子 Agent 已完成，但没有返回结果。`;
  }

  const sections: string[] = [
    `[子 Agent 结果] 第 ${cycleNumber} 轮执行结果汇总 (共 ${results.length} 个):\n`,
  ];

  results.forEach((result, index) => {
    sections.push(`\n## 子 Agent ${index + 1}: ${result.task}`);
    sections.push(`状态: ${result.status === "completed" ? "✅ 完成" : "❌ 失败"}`);

    if (result.status === "completed" && result.messages.length > 0) {
      sections.push("\n结果:");
      result.messages.forEach((msg) => {
        msg.parts.forEach((part) => {
          if (typeof part === "object" && part !== null && "text" in part) {
            const textPart = part as { text: string };
            sections.push(textPart.text);
          }
        });
      });
    }

    if (result.error) {
      sections.push(`\n错误: ${result.error}`);
    }
  });

  return sections.join("\n");
}

/**
 * Resume master agent with sub-agent results
 *
 * Creates a new streamText instance with the updated message history.
 */
export async function resumeMasterAgent(
  options: {
    model: Parameters<typeof streamText>[0]["model"];
    tools: Parameters<typeof streamText>[0]["tools"];
    system: Parameters<typeof streamText>[0]["system"];
    messages: ModelMessage[];
    subAgentResults: SubAgentResult[];
    cycleNumber: number;
    requestId?: string;
    providerOptions?: Parameters<typeof streamText>[0]["providerOptions"];
  },
) {
  const { model, tools, system, messages, cycleNumber, requestId, providerOptions } = options;

  // Resumption message is appended by caller (multi-stream orchestration loop).
  // Keep this function pure and avoid double-appending the same cycle summary.
  const updatedMessages = messages;

  // Create new stream with updated model messages
  const logPrefix = requestId
    ? `[${requestId}/Resume/Cycle-${cycleNumber}]`
    : `[MasterResume/Cycle-${cycleNumber}]`;

  return streamText({
    model,
    tools,
    system,
    messages: updatedMessages,
    providerOptions,
    experimental_onToolCallStart: ({ toolCall }) => {
      console.log(`${logPrefix} Tool started: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        input: toolCall.input,
      });
    },
    experimental_onToolCallFinish: ({ toolCall, durationMs, success, error }) => {
      console.log(`${logPrefix} Tool finished: ${toolCall.toolName}`, {
        toolCallId: toolCall.toolCallId,
        durationMs,
        success,
        error: error ? String(error) : undefined,
      });
    },
  });
}
