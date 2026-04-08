import { tool } from "ai";
import type { Tool } from "ai";
import { mergeToolDefaultInput, validateDefaultInputWithSchema } from "./tool-default-validator";
import type { AgentToolConfig } from "./types";

interface ResolveEnabledToolIdsOptions {
  allToolIds: string[];
  defaultEnabledToolIds: string[];
  toolConfigs?: Record<string, AgentToolConfig>;
}

export function resolveEnabledToolIds({
  allToolIds,
  defaultEnabledToolIds,
  toolConfigs,
}: ResolveEnabledToolIdsOptions): string[] {
  const allToolIdSet = new Set(allToolIds);
  const enabled = new Set(defaultEnabledToolIds.filter(toolId => allToolIdSet.has(toolId)));

  for (const [toolId, config] of Object.entries(toolConfigs || {})) {
    if (!allToolIdSet.has(toolId)) {
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

export function wrapToolWithDefaultInput(
  rawTool: Tool,
  defaultInput: Record<string, unknown> | undefined,
  logTag: string
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

  const validDefault = validateDefaultInputWithSchema(raw.inputSchema, defaultInput);
  if (!validDefault.valid) {
    console.warn(`[${logTag}] Invalid tool default input ignored: ${validDefault.error}`);
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
