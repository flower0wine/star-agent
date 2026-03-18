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
  /** Start index of repos to process (0-based, inclusive) */
  startIndex: number;
  /** End index of repos to process (exclusive) */
  endIndex: number;
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
    description: "当需要处理的仓库数量大于 200 时，使用该工具创建子 Agent 来分配处理",
    inputSchema: z.object({
      task: z
        .string()
        .describe("要分配给子 Agent 的任务描述，如「找出所有的 AI 相关的仓库」"),
      startIndex: z
        .number()
        .int()
        .min(0)
        .describe("要处理的仓库起始索引（包含初始索引）"),
      endIndex: z
        .number()
        .int()
        .min(1)
        .describe("要处理的仓库结束索引（不包含结束索引）"),
    }),
    execute: async (params: { task: string; startIndex: number; endIndex: number }): Promise<CreateSubAgentOutput> => {
      const { task, startIndex, endIndex } = params;

      // Get repos slice by index range
      const subRepos = repos.slice(startIndex, endIndex);

      // Create sub-agent tools (without displayRepositories)
      const subAgentTools = createSubAgentTools(subRepos);

      // Format repos for context
      const reposContext = formatReposForContext(subRepos);

      // Create sub-agent system prompt
      const subAgentSystemPrompt = `
你是一个热情且能力较强的助手，擅长使用工具帮助用户解决问题，遇到非常模糊的问题会主动询问用户。

# 用户信息
- GitHub 用户名: ${username}
- 仓库总数: ${repos.length} 个

# 用户仓库列表（完整）
以下是用户的完整仓库列表，请先阅读这些信息，这对你回答问题非常重要：

${reposContext}

# 工作职责

- 获取他们的星标仓库列表，并帮助他们找到想要的内容
- 通过提问澄清需求，缩小搜索范围
- 以清晰有条理的方式展示相关的仓库信息

# 约束

- 当你找到匹配的仓库时，直接将你选择的结果输出，不要输出其他的内容。

# 注意事项

- 如果用户未提供用户名，询问用户的 GitHub 用户名。
- 始终保持友好、对话式的沟通风格。以清晰、有组织的方式呈现仓库信息。
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
