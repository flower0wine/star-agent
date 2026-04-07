import { tool } from "ai";
import type { Tool } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import { createDisplayRepositoriesTool } from "@/agents/star/tools/display-repositories";
import { createGetRepositoryReadmeTool } from "@/agents/star/tools/get-readme";
import { createSearchRepositoriesTool } from "@/agents/star/tools/search-repository";
import { createGetAllReposTool } from "@/agents/master/tools/get-all-repos";
import { createCreateSubAgentTool } from "@/agents/master/tools/create-sub-agent";
import { createSearchPatentsTool } from "@/agents/patent/tools/search-patents";
import { createAnalyzePatentTrendsTool } from "@/agents/patent/tools/analyze-trends";
import { resolvePatentRuntimeConfig } from "@/agents/patent/static-config";
import { getDefaultEnabledTools, normalizeEnabledTools } from "./tool-registry";

interface ToolRuntimeContext {
  agentId: string;
  requestId: string;
  repos?: GitHubRepo[];
  username?: string;
  customParams?: Record<string, unknown>;
  staticParams?: Record<string, unknown>;
  toolConfigs?: Record<string, { enabled?: boolean; defaultInput?: Record<string, unknown> }>;
}

function getRepos(context: ToolRuntimeContext): GitHubRepo[] {
  return context.repos || [];
}

function mergeToolInputDefaults(
  defaults: Record<string, unknown>,
  input: unknown
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...defaults };
  if (!input || typeof input !== "object") {
    return merged;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function wrapToolWithDefaultInput(
  rawTool: Tool,
  defaultInput?: Record<string, unknown>
): Tool {
  if (!defaultInput || Object.keys(defaultInput).length === 0) {
    return rawTool;
  }

  const raw = rawTool as {
    description?: string;
    inputSchema?: unknown;
    execute?: (input: unknown, options?: unknown) => Promise<unknown> | unknown;
  };

  if (typeof raw.execute !== "function" || !raw.inputSchema) {
    return rawTool;
  }

  return tool({
    description: raw.description,
    inputSchema: raw.inputSchema,
    execute: async (input, options) => raw.execute?.(
      mergeToolInputDefaults(defaultInput, input),
      options
    ),
  });
}

function createRawTool(toolId: string, context: ToolRuntimeContext): Tool | null {
  const repos = getRepos(context);
  const username = context.username || "unknown";
  const sessionId = context.requestId;
  const patentRuntimeConfig = resolvePatentRuntimeConfig(context.staticParams, context.customParams);

  switch (toolId) {
    case "searchRepositories":
      return createSearchRepositoriesTool(repos);
    case "displayRepositories":
      return createDisplayRepositoriesTool(repos);
    case "getRepositoryReadme":
      return createGetRepositoryReadmeTool(repos);
    case "getAllRepos":
      return createGetAllReposTool(repos);
    case "createSubAgent":
      return createCreateSubAgentTool(
        repos,
        username,
        sessionId,
        context.agentId,
        context.customParams
      );
    case "searchPatents":
      return createSearchPatentsTool(patentRuntimeConfig);
    case "analyzePatentTrends":
      return createAnalyzePatentTrendsTool(patentRuntimeConfig);
    default:
      return null;
  }
}

export function resolveEnabledToolIds(
  agentId: string,
  requestedEnabledTools: string[] | undefined,
  toolConfigs?: Record<string, { enabled?: boolean; defaultInput?: Record<string, unknown> }>
): string[] {
  const base = normalizeEnabledTools(agentId, requestedEnabledTools || getDefaultEnabledTools(agentId));
  const disabledByConfig = new Set(
    Object.entries(toolConfigs || {})
      .filter(([, config]) => config?.enabled === false)
      .map(([toolId]) => toolId)
  );

  return base.filter(toolId => !disabledByConfig.has(toolId));
}

export function createRuntimeTools(
  enabledToolIds: string[],
  context: ToolRuntimeContext
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};

  for (const toolId of enabledToolIds) {
    const rawTool = createRawTool(toolId, context);
    if (!rawTool) {
      continue;
    }
    const defaultInput = context.toolConfigs?.[toolId]?.defaultInput;
    tools[toolId] = wrapToolWithDefaultInput(rawTool, defaultInput);
  }

  return tools;
}

