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
import { createDisplayRepositoriesTool } from "../star/tools/display-repositories";

/**
 * Create Master Agent configuration
 *
 * @param repos - GitHub repositories (for getAllRepos tool)
 * @param username - GitHub username
 * @param customParams - User dynamic custom params
 * @returns Agent configuration for registry
 */
export function createMasterAgent(
  repos: GitHubRepo[],
  username: string,
  customParams?: Record<string, unknown>
): AgentConfig {
  return {
    id: masterAgent.id,
    name: masterAgent.name,
    description: masterAgent.description,
    icon: masterAgent.icon,

    getTools: (context: Record<string, unknown>) => {
      const requestId = typeof context.requestId === "string" ? context.requestId : undefined;
      const sessionId = requestId || `master-${username}`;

      return {
        getAllRepos: createGetAllReposTool(repos),
        createSubAgent: createCreateSubAgentTool(
          repos,
          username,
          sessionId,
          masterAgent.id,
          customParams
        ),
        displayRepositories: createDisplayRepositoriesTool(repos),
      };
    },

    getSystemPrompt: () => {
      const masterContext: MasterAgentContext = {
        username,
        reposCount: repos.length,
      };
      return getMasterSystemPrompt(masterContext);
    },
  };
}

// Re-export for convenience
export { masterAgent };
