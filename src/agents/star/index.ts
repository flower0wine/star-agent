/**
 * Star Agent
 *
 * This module exports the Star Agent configuration and provides
 * a function to create the agent with its tools and prompts.
 */

import type { AgentConfig } from "@/lib/agents/registry";
import type { GitHubRepo } from "@/lib/github/api";
import { starAgent } from "./config";
import { getStarSystemPrompt } from "./prompt";
import type { StarAgentContext } from "./prompt";
import { createStarTools } from "./tools";

/**
 * Create Star Agent configuration
 *
 * @param repos - GitHub repositories to use as context
 * @returns Agent configuration for registry
 */
export function createStarAgent(repos: GitHubRepo[]): AgentConfig {
  // Create tools with repos bound
  const tools = createStarTools(repos);

  return {
    id: starAgent.id,
    name: starAgent.name,
    description: starAgent.description,
    icon: starAgent.icon,

    getTools: () => tools,

    getSystemPrompt: (context: Record<string, unknown>) => {
      // Extract context for prompt
      const starContext: StarAgentContext = {
        username: context.username as string,
        repos,
        reposContext: context.reposContext as string | undefined,
      };
      return getStarSystemPrompt(starContext);
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
export { starAgent };
