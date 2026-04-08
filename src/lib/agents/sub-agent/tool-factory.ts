import type { Tool } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import { createDisplayRepositoriesTool } from "@/agents/star/tools/display-repositories";
import { createGetRepositoryReadmeTool } from "@/agents/star/tools/get-readme";
import { createSearchRepositoriesTool } from "@/agents/star/tools/search-repository";
import { createGetAllReposTool } from "@/agents/master/tools/get-all-repos";
import { resolveEnabledToolIds, wrapToolWithDefaultInput } from "@/lib/agents/base/tool-config-resolver";
import type { AgentToolConfig } from "@/lib/agents/base/types";
import { DEFAULT_SUBAGENT_ENABLED_TOOL_IDS } from "./tool-config";
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
  toolConfigs: Record<string, AgentToolConfig>,
  context: SubAgentToolRuntimeContext
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  const supportedToolIds = Object.keys(SUB_AGENT_TOOL_FACTORIES);
  const enabledToolIds = resolveEnabledToolIds({
    allToolIds: supportedToolIds,
    defaultEnabledToolIds: [...DEFAULT_SUBAGENT_ENABLED_TOOL_IDS],
    toolConfigs,
  });

  for (const toolId of enabledToolIds) {
    const factory = SUB_AGENT_TOOL_FACTORIES[toolId];
    if (!factory) {
      throw new SubAgentConfigError(
        "SUBAGENT_TOOL_UNSUPPORTED",
        `Tool "${toolId}" is not supported by sub-agent runtime`
      );
    }
    const rawTool = factory(context);
    tools[toolId] = wrapToolWithDefaultInput(
      rawTool,
      toolConfigs[toolId]?.defaultInput,
      "sub-agent/tool-factory"
    );
  }

  return tools;
}
