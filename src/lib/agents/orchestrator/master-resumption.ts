/**
 * Master Agent Resumption
 *
 * Handles resuming master agent execution with sub-agent results.
 */

import { convertToModelMessages, streamText } from "ai";
import type { UIMessage } from "ai";
import type { SubAgentResult } from "./types";

/**
 * Create resumption message from sub-agent results
 *
 * This message will be appended to the conversation to resume the master agent.
 */
export function createResumptionMessage(
  results: SubAgentResult[],
  cycleNumber: number
): UIMessage {
  const content = formatResultsAsMessage(results, cycleNumber);

  return {
    id: `subagent-results-cycle-${cycleNumber}-${Date.now()}`,
    role: "user",
    parts: [
      {
        type: "text",
        text: content,
      },
    ],
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
    return `[系统消息] 第 ${cycleNumber} 轮：所有子 Agent 已完成，但没有返回结果。`;
  }

  const sections: string[] = [
    `[系统消息] 第 ${cycleNumber} 轮子 Agent 执行结果汇总 (共 ${results.length} 个):\n`,
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

  sections.push(
    "\n---\n请根据以上子 Agent 的执行结果，为用户提供汇总分析和最终答案。如果需要进一步处理，可以继续创建新的子 Agent。"
  );

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
    messages: UIMessage[];
    subAgentResults: SubAgentResult[];
    cycleNumber: number;
    providerOptions?: Parameters<typeof streamText>[0]["providerOptions"];
  },
) {
  const { model, tools, system, messages, subAgentResults, cycleNumber, providerOptions } = options;

  // Create resumption message
  const resumptionMessage = createResumptionMessage(subAgentResults, cycleNumber);

  // Append to message history
  const updatedMessages = [...messages, resumptionMessage];

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(updatedMessages, {
    tools,
  });

  // Create new stream with updated messages
  return streamText({
    model,
    tools,
    system,
    messages: modelMessages,
    providerOptions,
  });
}
