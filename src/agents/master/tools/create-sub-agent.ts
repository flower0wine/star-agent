/**
 * Create Sub-Agent Tool
 *
 * Tool for creating and running sub-agents (StarAgent) to process repos
 */

import { tool, ToolLoopAgent } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";
import type { ModelInstance } from "@/app/api/chat/model";
import { createSearchRepositoriesTool } from "@/agents/star/tools/search-repository";
import { createGetRepositoryReadmeTool } from "@/agents/star/tools/get-readme";

export interface CreateSubAgentInput {
  /** The task to delegate to the sub-agent */
  task: string;
  /** Repositories to process (slice of total repos) */
  repos: GitHubRepo[];
}

export interface CreateSubAgentOutput {
  result: string;
  reposProcessed: number;
  message: string;
}

/**
 * Create sub-agent tools (without displayRepositories)
 * Replicates StarAgent tools but excludes displayRepositories
 */
function createSubAgentTools(repos: GitHubRepo[]) {
  return {
    searchRepositories: createSearchRepositoriesTool(repos),
    getRepositoryReadme: createGetRepositoryReadmeTool(repos),
  };
}

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
 * Create Create Sub-Agent Tool
 *
 * Creates a tool that spawns a StarAgent sub-agent to process a slice of repos
 */
export function createCreateSubAgentTool(
  repos: GitHubRepo[],
  model: ModelInstance,
  username: string
) {
  return tool({
    description: "创建子 Agent 来处理部分仓库，当仓库数量超过 200 时使用此工具",
    inputSchema: z.object({
      task: z
        .string()
        .describe("要分配给子 Agent 的任务描述，如「找出 React 相关的仓库」"),
      repos: z
        .array(
          z.object({
            id: z.number(),
            name: z.string(),
            full_name: z.string(),
            description: z.string().nullable(),
            html_url: z.string(),
            stargazers_count: z.number(),
            forks_count: z.number(),
            language: z.string().nullable(),
            topics: z.array(z.string()),
            updated_at: z.string(),
            owner: z.object({
              login: z.string(),
              avatar_url: z.string(),
              html_url: z.string(),
            }),
            license: z.object({ spdx_id: z.string() }).nullable(),
            visibility: z.string(),
            watchers_count: z.number(),
          })
        )
        .describe("分配给子 Agent 的仓库列表"),
    }),
    execute: async (params: { task: string; repos: unknown[] }): Promise<CreateSubAgentOutput> => {
      const { task } = params;
      const subRepos = params.repos as GitHubRepo[];

      // Create sub-agent tools (without displayRepositories)
      const subAgentTools = createSubAgentTools(subRepos);

      // Format repos for context
      const reposContext = formatReposForContext(subRepos);

      // Create sub-agent system prompt
      const subAgentSystemPrompt = `
  你是一个热情且能力较强的助手，擅长使用工具帮助用户解决问题。

  # 用户信息
  - GitHub 用户名: ${username}
  - 仓库总数: ${subRepos.length} 个

  # 用户仓库列表（分配给你的部分）
  以下是分配给你的仓库列表：

  ${reposContext}

  # 工作职责
  - 根据用户的要求，在分配的仓库中找出符合条件的仓库
  - 使用 searchRepositories 工具搜索仓库
  - 使用 getRepositoryReadme 工具获取仓库的 README 了解详情

  # 约束
  - 不要使用 displayRepositories 工具展示仓库，结果会以文本形式返回给主 Agent

  # 注意事项
  - 始终保持友好、对话式的沟通风格
      `.trim();

      // Create sub-agent using ToolLoopAgent
      const subAgent = new ToolLoopAgent({
        model: model.model,
        instructions: subAgentSystemPrompt,
        tools: subAgentTools,
      });

      // Execute sub-agent
      const result = await subAgent.generate({
        prompt: task,
      });

      return {
        result: result.text,
        reposProcessed: subRepos.length,
        message: `子 Agent 已处理 ${subRepos.length} 个仓库`,
      };
    },
  });
}
