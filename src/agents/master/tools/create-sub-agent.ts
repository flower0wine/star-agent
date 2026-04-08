import { tool } from "ai";
import type { GitHubRepo } from "@/lib/github/api";
import { getSubAgentManager } from "@/lib/agents/sub-agent/manager";
import type {
  CreateSubAgentToolOutput,
} from "@/lib/agents/sub-agent/types";
import type { AgentToolConfig } from "@/lib/agents/base/types";
import { buildSubAgentRuntimeVariables } from "@/lib/agents/sub-agent/runtime-variables";
import { resolveBoundSubAgentProfile } from "@/lib/agents/sub-agent/bindings";
import { buildResolvedTemplateVars } from "@/lib/agents/sub-agent/template-renderer";
import { SubAgentConfigError } from "@/lib/agents/sub-agent/profile-schema";
import {
  buildCreateSubAgentInputSchema,
  buildCreateSubAgentToolDescription,
  parseCreateSubAgentExecutionInput,
  resolveCreateSubAgentParameterConfig,
} from "@/lib/agents/sub-agent/dynamic-schema";

function extractReposByRange(
  repos: GitHubRepo[],
  rangeStart?: number,
  rangeEnd?: number
): GitHubRepo[] {
  if (rangeStart === undefined && rangeEnd === undefined) {
    return repos;
  }
  const start = rangeStart === undefined ? 0 : Math.max(0, Math.floor(rangeStart));
  const endBase = rangeEnd === undefined ? repos.length : Math.max(start, Math.floor(rangeEnd));
  return repos.slice(start, Math.min(endBase, repos.length));
}

export function createCreateSubAgentTool(
  repos: GitHubRepo[],
  username: string,
  sessionId: string,
  parentAgentId: string,
  customParams?: Record<string, unknown>,
  toolConfig?: AgentToolConfig
) {
  const paramConfig = resolveCreateSubAgentParameterConfig(toolConfig?.dynamicParameters);
  const inputSchema = buildCreateSubAgentInputSchema(paramConfig);
  const description = buildCreateSubAgentToolDescription(paramConfig);

  return tool({
    description,
    inputSchema,
    execute: async (params: unknown): Promise<CreateSubAgentToolOutput & { __duration: number }> => {
      const startTime = Date.now();

      try {
        const manager = getSubAgentManager();
        const profile = resolveBoundSubAgentProfile({
          customParams,
          toolConfig,
        });
        const validatedInput = inputSchema.parse(params) as Record<string, unknown>;
        const parsed = parseCreateSubAgentExecutionInput(validatedInput, paramConfig);
        const selectedRepos = extractReposByRange(repos, parsed.rangeStart, parsed.rangeEnd);
        const runtimeVars = buildSubAgentRuntimeVariables({
          username,
          parentAgentId,
          task: parsed.task,
          repos: selectedRepos,
        });
        const resolvedVars = buildResolvedTemplateVars({
          runtimeVars: {
            ...runtimeVars,
            ...parsed.runtimeParams,
          },
          varSchema: profile.varSchema,
        });

        const result = manager.addTask(
          {
            task: parsed.task,
            repos: selectedRepos,
            username,
            progress: 0,
            parentAgentId,
            profileId: profile.id,
            profileVersion: profile.version,
            originTool: "createSubAgent",
            runtimeVars: resolvedVars,
            profileSnapshot: profile,
          },
          sessionId
        );

        return {
          ...result,
          __duration: Date.now() - startTime,
        };
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "createSubAgent 执行失败";
        const code = error instanceof SubAgentConfigError
          ? error.code
          : undefined;

        return {
          status: "failed",
          message: "未能创建子 Agent，请先修复配置后重试。",
          error: message,
          code,
          recoverable: true,
          __duration: Date.now() - startTime,
        };
      }
    },
  });
}
