import { tool } from "ai";
import type { Tool } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import { resolvePatentRuntimeConfig } from "@/agents/patent/static-config";
import type { AgentConfigPayload } from "@/app/api/chat/types";
import { applyPromptConfig, createPromptTemplateVars } from "@/lib/agents/prompt-template";
import { getAgentDefinition } from "./agent-definitions";
import { getToolDefinition, listToolDefinitions } from "./tool-definitions";
import { mergeToolDefaultInput, validateDefaultInputWithSchema } from "./tool-default-validator";
import { findUnknownPromptVariables } from "./prompt-template-validator";
import type { AgentId, AgentToolConfig } from "./types";

interface ResolveRuntimeInput {
  agentId: AgentId;
  requestId: string;
  repos?: GitHubRepo[];
  username?: string;
  agentConfig?: AgentConfigPayload;
}

interface ResolvedRuntimeOutput {
  systemPrompt: string;
  tools: Record<string, Tool>;
  enabledToolIds: string[];
}

function resolveEnabledToolIds(
  agentId: AgentId,
  toolConfigs: Record<string, AgentToolConfig> | undefined
): string[] {
  const allToolIds = new Set(listToolDefinitions().map(tool => tool.id));
  const enabled = new Set(
    listToolDefinitions()
      .filter(tool => tool.defaultEnabledAgentIds.includes(agentId))
      .map(tool => tool.id)
  );

  for (const [toolId, config] of Object.entries(toolConfigs || {})) {
    if (!allToolIds.has(toolId)) {
      continue;
    }
    if (config.enabled === true) {
      enabled.add(toolId);
      continue;
    }
    if (config.enabled === false) {
      enabled.delete(toolId);
    }
  }

  return [...enabled];
}

function wrapToolWithDefaultInput(rawTool: Tool, defaultInput?: Record<string, unknown>): Tool {
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

  const validDefault = validateDefaultInputWithSchema(raw.inputSchema, defaultInput);
  if (!validDefault.valid) {
    console.warn(`[runtime-resolver] Invalid tool default input ignored: ${validDefault.error}`);
    return rawTool;
  }

  return tool({
    description: raw.description,
    inputSchema: raw.inputSchema,
    execute: async (input: unknown, options: unknown) => raw.execute?.(
      mergeToolDefaultInput(validDefault.normalized || defaultInput, input),
      options
    ),
  } as any);
}

export function resolveAgentRuntime(input: ResolveRuntimeInput): ResolvedRuntimeOutput {
  const {
    agentId,
    requestId,
    username,
    agentConfig,
  } = input;
  const repos = input.repos || [];
  const definition = getAgentDefinition(agentId);
  if (!definition) {
    throw new Error(`Agent "${agentId}" is not registered`);
  }

  const runtimeConfig = resolvePatentRuntimeConfig(agentConfig?.staticParams, agentConfig?.customParams);
  const promptVars = createPromptTemplateVars({
    username,
    reposCount: repos.length,
    extras: {
      repos_context: repos
        .map(repo => `${repo.full_name} | ${repo.description || "无描述"} | ⭐${repo.stargazers_count}`)
        .join("\n"),
      provider: runtimeConfig.provider,
      default_lookback_months: runtimeConfig.defaultLookbackMonths,
      max_results_per_request: runtimeConfig.maxResultsPerRequest,
      default_sort_by: runtimeConfig.defaultSortBy,
    },
  });

  const effectiveTemplate = agentConfig?.systemPromptTemplate?.trim() || definition.defaultPromptTemplate;
  const unknownVars = findUnknownPromptVariables(effectiveTemplate, definition.promptVariables);
  if (unknownVars.length > 0) {
    console.warn(`[runtime-resolver] Unknown prompt variables for agent "${agentId}": ${unknownVars.join(", ")}`);
  }

  const systemPrompt = applyPromptConfig(definition.defaultPromptTemplate, {
    systemPromptTemplate: effectiveTemplate,
  }, promptVars);

  const enabledToolIds = resolveEnabledToolIds(agentId, agentConfig?.toolConfigs);
  const tools: Record<string, Tool> = {};

  for (const toolId of enabledToolIds) {
    const definition = getToolDefinition(toolId);
    if (!definition) {
      continue;
    }
    const rawTool = definition.factory({
      agentId,
      requestId,
      repos,
      username,
      customParams: agentConfig?.customParams,
      staticParams: agentConfig?.staticParams,
      patentRuntimeConfig: runtimeConfig,
      toolConfig: agentConfig?.toolConfigs?.[toolId],
    });
    tools[toolId] = wrapToolWithDefaultInput(rawTool, agentConfig?.toolConfigs?.[toolId]?.defaultInput);
  }

  return {
    systemPrompt,
    tools,
    enabledToolIds,
  };
}
