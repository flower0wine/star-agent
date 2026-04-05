import type { Tool } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import { createDisplayRepositoriesTool } from "@/agents/star/tools/display-repositories";
import { createGetRepositoryReadmeTool } from "@/agents/star/tools/get-readme";
import { createSearchRepositoriesTool } from "@/agents/star/tools/search-repository";
import { createGetAllReposTool } from "@/agents/master/tools/get-all-repos";
import { SubAgentConfigError } from "./profile-schema";

interface SubAgentToolRuntimeContext {
  repos: GitHubRepo[];
}

type ToolFactory = (context: SubAgentToolRuntimeContext) => Tool;

const SUB_AGENT_TOOL_FACTORIES: Record<string, ToolFactory> = {
  searchRepositories: context => createSearchRepositoriesTool(context.repos),
  getRepositoryReadme: context => createGetRepositoryReadmeTool(context.repos),
  displayRepositories: context => createDisplayRepositoriesTool(context.repos),
  getAllRepos: context => createGetAllReposTool(context.repos),
};

export function createSubAgentTools(
  toolIds: string[],
  context: SubAgentToolRuntimeContext
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  for (const toolId of toolIds) {
    const factory = SUB_AGENT_TOOL_FACTORIES[toolId];
    if (!factory) {
      throw new SubAgentConfigError(
        "SUBAGENT_TOOL_UNSUPPORTED",
        `Tool "${toolId}" is not supported by sub-agent runtime`
      );
    }
    tools[toolId] = factory(context);
  }

  return tools;
}
