/**
 * Sub-Agent Executor
 *
 * Handles the actual execution of sub-agent tasks with streaming output.
 */

import { ToolLoopAgent, createAgentUIStream } from "ai";
import { buildChatMessageMetadata } from "@/lib/chat/message-metadata";
import type { GitHubRepo } from "@/lib/github/api";
import type { SubAgentTask, SubAgentProgress } from "./types";
import { createSubAgentTools } from "./tool-factory";
import { renderTemplate } from "./template-renderer";

/**
 * Format repos for sub-agent context
 */
function formatReposForContext(repos: GitHubRepo[]): string {
  return repos
    .map((repo) => {
      const parts = [
        repo.full_name,
        repo.description || "无描述",
        `⭐${repo.stargazers_count}`,
        repo.language || "",
        repo.topics.join(", "),
      ];
      return parts.join(" | ");
    })
    .join("\n");
}

/**
 * Get sub-agent system prompt
 */
function buildSubAgentSystemPrompt(task: SubAgentTask): string {
  const vars: Record<string, string | number | boolean> = {
    ...task.runtimeVars,
    repos_context: formatReposForContext(task.repos),
    task: task.task,
  };
  return renderTemplate(task.profileSnapshot.systemPromptTemplate, vars);
}

/**
 * Execute sub-agent task with streaming
 *
 * @param task - Task to execute
 * @param onProgress - Progress callback
 * @param abortSignal - Abort signal
 */
export async function executeSubAgentTask(
  task: SubAgentTask,
  onProgress: (progress: SubAgentProgress) => void,
  abortSignal: AbortSignal
): Promise<void> {
  console.log(`[Executor/${task.id}] Starting sub-agent task...`);
  console.log(`[Executor/${task.id}] Task: ${task.task}`);
  console.log(`[Executor/${task.id}] Repos count: ${task.repos.length}`);

  // Get model instance (import dynamically to avoid circular dependency)
  const { getModel } = await import("@/app/api/chat/model");
  const modelInstance = await getModel();
  console.log(`[Executor/${task.id}] Model obtained`);

  // Create tools
  const subAgentTools = createSubAgentTools(task.profileSnapshot.toolIds, {
    repos: task.repos,
  });
  console.log(`[Executor/${task.id}] Tools created: ${Object.keys(subAgentTools).join(", ")}`);

  // Get system prompt
  const systemPrompt = buildSubAgentSystemPrompt(task);
  console.log(`[Executor/${task.id}] System prompt length: ${systemPrompt.length}`);

  // Create ToolLoopAgent
  console.log(`[Executor/${task.id}] Creating ToolLoopAgent...`);
  const subAgent = new ToolLoopAgent({
    model: modelInstance.model,
    instructions: systemPrompt,
    tools: subAgentTools,
  });
  console.log(`[Executor/${task.id}] ToolLoopAgent created`);

  let currentProgress = 0;
  let lastProgressEmitAt = 0;

  // Add timeout to prevent hanging
  const timeoutMs = task.profileSnapshot.limits.timeoutMs;

  try {
    console.log(`[Executor/${task.id}] Creating agent UI stream...`);

    // Create proper UIMessage format for createAgentUIStream
    // Must use parts array, not content string
    const uiMessages = [
      {
        id: `user-${Date.now()}`,
        role: "user" as const,
        parts: [{ type: "text", text: task.task }],
      },
    ];

    console.log(`[Executor/${task.id}] UI messages (parts format):`, JSON.stringify(uiMessages));

    // Use createAgentUIStream for streaming execution
    const generationStartedAt = new Date().toISOString();
    const stream = await createAgentUIStream({
      agent: subAgent,
      uiMessages,
      abortSignal,
      timeout: timeoutMs,
      messageMetadata: ({ part }) => {
        if (part.type !== "finish") {
          return undefined;
        }

        const generationFinishedAt = new Date().toISOString();
        return buildChatMessageMetadata({
          totalUsage: part.totalUsage,
          startedAt: generationStartedAt,
          finishedAt: generationFinishedAt,
        });
      },
    });
    console.log(`[Executor/${task.id}] Agent UI stream created, type:`, typeof stream);

    // Process streaming output
    console.log(`[Executor/${task.id}] Starting iteration over stream...`);
    for await (const chunk of stream) {
      if (abortSignal.aborted) {
        console.log(`[Executor/${task.id}] Aborted, breaking`);
        break;
      }

      // Forward the complete UIMessageChunk directly
      if (chunk && typeof chunk === "object") {
        const chunkObj = chunk as Record<string, unknown>;

        // Send the complete chunk as message-chunk
        onProgress({
          taskId: task.id,
          type: "message-chunk",
          chunk: chunkObj,
          subAgent: {
            profileId: task.profileId,
            profileVersion: task.profileVersion,
            originTool: task.originTool,
          },
        });

        // Track progress for progress indicator
        if ("type" in chunkObj) {
          const chunkType = chunkObj.type as string;
          if (chunkType === "finish") {
            currentProgress = 100;
            // 注意: 不要在这里覆盖 task.result
            // notify() 会在处理 "finish" chunk 时设置实际的 task.result
          } else if (chunkType === "text-delta" && currentProgress < 90) {
            currentProgress = Math.min(currentProgress + 5, 90);
            const now = Date.now();
            if (now - lastProgressEmitAt >= 120) {
              lastProgressEmitAt = now;
              onProgress({
                taskId: task.id,
                type: "progress",
                progress: currentProgress,
                subAgent: {
                  profileId: task.profileId,
                  profileVersion: task.profileVersion,
                  originTool: task.originTool,
                },
              });
            }
          }
        }
      }
    }

    // Mark complete - 只有在 task.result 未被设置时才使用默认值
    if (!task.result) {
      task.result = "处理完成";
    }
    currentProgress = 100;
    onProgress({
      taskId: task.id,
      type: "complete",
      progress: 100,
      result: task.result,
      subAgent: {
        profileId: task.profileId,
        profileVersion: task.profileVersion,
        originTool: task.originTool,
      },
    });
  } catch (error) {
    console.error(`[Executor/${task.id}] Error:`, error);
    if (abortSignal.aborted) {
      console.log(`[Executor/${task.id}] Aborted, throwing`);
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Executor/${task.id}] Error message: ${errorMessage}`);

    task.result = undefined;
    onProgress({
      taskId: task.id,
      type: "error",
      error: errorMessage,
      progress: currentProgress,
      subAgent: {
        profileId: task.profileId,
        profileVersion: task.profileVersion,
        originTool: task.originTool,
      },
    });

    throw error;
  }
}

