/**
 * Master Agent
 *
 * This module exports the Master Agent configuration and provides
 * a function to create the agent with its tools and prompts.
 */

import type { AgentConfig } from "@/lib/agents/registry";
import type { GitHubRepo } from "@/lib/github/api";
import { masterAgent } from "./config";
import { getMasterSystemPrompt } from "./prompt";
import type { MasterAgentContext } from "./prompt";
import { createGetAllReposTool, createCreateSubAgentTool } from "./tools";
import type { ModelInstance } from "@/app/api/chat/model";

/**
 * Create Master Agent configuration
 *
 * @param repos - GitHub repositories (for getAllRepos tool)
 * @param model - Model instance (for creating sub-agents)
 * @param username - GitHub username
 * @returns Agent configuration for registry
 */
export function createMasterAgent(
  repos: GitHubRepo[],
  model: ModelInstance,
  username: string
): AgentConfig {
  // Create tools
  const tools = {
    getAllRepos: createGetAllReposTool(repos),
    createSubAgent: createCreateSubAgentTool(repos, model, username),
  };

  return {
    id: masterAgent.id,
    name: masterAgent.name,
    description: masterAgent.description,
    icon: masterAgent.icon,

    getTools: () => tools,

    getSystemPrompt: (context: Record<string, unknown>) => {
      const masterContext: MasterAgentContext = {
        username,
        reposCount: repos.length,
      };
      return getMasterSystemPrompt(masterContext);
    },
  };
}

/**
 * Format repos for initial context (used in system prompt)
 * Exported for external use
 */
export function formatReposForInitialContext(repos: GitHubRepo[]): string {
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

// Re-export for convenience
export { masterAgent };
