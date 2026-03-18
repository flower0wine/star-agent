/**
 * Master Agent
 *
 * This module exports the Master Agent configuration and provides
 * a function to create the agent with its tools and prompts.
 */

import type { AgentConfig } from "@/lib/agents/registry";
import type { GitHubRepo } from "@/lib/github/api";
import { formatReposForInitialContext } from "@/lib/github/utils";
import { masterAgent } from "./config";
import { getMasterSystemPrompt } from "./prompt";
import type { MasterAgentContext } from "./prompt";
import { createGetAllReposTool, createCreateSubAgentTool } from "./tools";
import type { ModelInstance } from "@/app/api/chat/model";
import { createDisplayRepositoriesTool } from "../star/tools/display-repositories";

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
    displayRepositories: createDisplayRepositoriesTool(repos),
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

// Re-export for convenience
export { masterAgent };
