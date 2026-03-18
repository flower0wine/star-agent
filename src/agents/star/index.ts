/**
 * Star Agent
 *
 * This module exports the Star Agent configuration and provides
 * a function to create the agent with its tools and prompts.
 */

import type { AgentConfig } from "@/lib/agents/registry";
import type { GitHubRepo } from "@/lib/github/api";
import { formatReposForInitialContext } from "@/lib/github/utils";
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
      };
      return getStarSystemPrompt(starContext);
    },
  };
}

// Re-export for convenience
export { starAgent };
