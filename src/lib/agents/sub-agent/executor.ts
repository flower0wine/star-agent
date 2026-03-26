/**
 * Sub-Agent Executor
 *
 * Handles the actual execution of sub-agent tasks with streaming output.
 */

import { ToolLoopAgent, createAgentUIStream } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import type { ModelInstance } from "@/app/api/chat/model";
import type { SubAgentTask, SubAgentProgress } from "./types";
import { createSearchRepositoriesTool } from "@/agents/star/tools/search-repository";
import { createGetRepositoryReadmeTool } from "@/agents/star/tools/get-readme";

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
function getSubAgentSystemPrompt(
  repos: GitHubRepo[],
  username: string
): string {
  const reposContext = formatReposForContext(repos);

  return `
你是一个热情且能力较强的助手，擅长使用工具帮助用户解决问题，遇到非常模糊的问题会主动询问用户。

# 用户信息
- GitHub 用户名: ${username}
- 仓库总数: ${repos.length} 个

# 用户仓库列表（完整）
以下是用户的完整仓库列表，请先阅读这些信息，这对你回答问题非常重要：

${reposContext}

# 工作职责

- 获取他们的星标仓库列表，并帮助他们找到想要的内容。
- 通过提问澄清需求，缩小搜索范围。
- 以清晰有条理的方式展示相关的仓库信息。
- 每个仓库需要给出与用户想找的仓库的关联分数，只给出关联分数超过 0.7 的仓库。

# 约束

- 当你找到匹配的仓库时，直接将你选择的结果输出，不要输出其他的内容。

# 注意事项

- 如果用户未提供用户名，询问用户的 GitHub 用户名。
- 始终保持友好、对话式的沟通风格。以清晰、有组织的方式呈现仓库信息。
`.trim();
}

/**
 * Create sub-agent tools
 */
function createSubAgentTools(repos: GitHubRepo[]) {
  return {
    searchRepositories: createSearchRepositoriesTool(repos),
    getRepositoryReadme: createGetRepositoryReadmeTool(repos),
  };
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
  const modelInstance = getModel();
  console.log(`[Executor/${task.id}] Model obtained`);

  // Create tools
  const subAgentTools = createSubAgentTools(task.repos);
  console.log(`[Executor/${task.id}] Tools created: ${Object.keys(subAgentTools).join(", ")}`);

  // Get system prompt
  const systemPrompt = getSubAgentSystemPrompt(task.repos, task.username);
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
  const totalRepos = task.repos.length;

  // Add timeout to prevent hanging
  const timeoutMs = 120000; // 2 minutes timeout

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
    const stream = await createAgentUIStream({
      agent: subAgent,
      uiMessages,
      abortSignal,
      timeout: timeoutMs,
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
        });

        // Track progress for progress indicator
        if ("type" in chunkObj) {
          const chunkType = chunkObj.type as string;
          if (chunkType === "finish") {
            currentProgress = 100;
            task.result = "处理完成";
          } else if (chunkType === "text-delta" && currentProgress < 90) {
            currentProgress = Math.min(currentProgress + 5, 90);
            onProgress({
              taskId: task.id,
              type: "progress",
              progress: currentProgress,
            });
          }
        }
      }
    }

    // Mark complete
    task.result = task.result || "处理完成";
    currentProgress = 100;
    onProgress({
      taskId: task.id,
      type: "complete",
      progress: 100,
      result: task.result,
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
    });

    throw error;
  }
}
