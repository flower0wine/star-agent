/**
 * Star Agent System Prompt
 *
 * Exact prompt copied from original route.ts to maintain functionality
 */

import type { GitHubRepo } from "@/lib/github/api";

/**
 * Format repos for initial context (used in system prompt)
 */
function formatReposForInitialContext(repos: GitHubRepo[]): string {
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

export interface StarAgentContext {
  username: string;
  repos: GitHubRepo[];
  reposContext?: string; // Optional pre-formatted context
}

/**
 * Get system prompt for Star Agent
 * Exact copy from original to maintain behavior
 */
export function getStarSystemPrompt(context: StarAgentContext): string {
  const username = context.username;
  const repos = context.repos;
  const reposContext = context.reposContext || formatReposForInitialContext(repos);

  return `
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

 - 当你找到匹配的仓库时，使用 displayRepositories 工具展示，不可直接以文本的形式呈现。

 # 注意事项

 - 如果用户未提供用户名，询问用户的 GitHub 用户名。
 - 始终保持友好、对话式的沟通风格。以清晰、有组织的方式呈现仓库信息。
 `.trim();
}
