/**
 * Star Agent
 *
 * This module exports the Star Agent configuration and provides
 * a function to create the agent with its tools and prompts.
 */

import type { AgentConfig } from "@/lib/agents/registry";
import type { GitHubRepo } from "@/lib/github/api";
import { formatReposForInitialContext } from "@/lib/github/utils";
import { createPromptTemplateVars, renderPromptTemplate } from "@/lib/agents/prompt-template";
import { getDefaultSystemPromptTemplate } from "@/lib/agents/default-system-prompt-template";
import { starAgent } from "./config";
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
      const username = typeof context.username === "string" ? context.username : "";
      return renderPromptTemplate(
        getDefaultSystemPromptTemplate("star"),
        createPromptTemplateVars({
          username,
          reposCount: repos.length,
          extras: {
            repos_context: formatReposForInitialContext(repos),
          },
        })
      );
    },
  };
}

// Re-export for convenience
export { starAgent };
