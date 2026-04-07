import { tool } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";
import { getSubAgentManager } from "@/lib/agents/sub-agent/manager";
import type {
  CreateSubAgentTaskOutput,
  SubAgentPayloadRef,
  SubAgentProfile,
} from "@/lib/agents/sub-agent/types";
import {
  SubAgentConfigError,
  resolveEnabledProfilesForAgent,
} from "@/lib/agents/sub-agent/profile-schema";
import {
  buildResolvedTemplateVars,
  renderTemplate,
} from "@/lib/agents/sub-agent/template-renderer";

const createSubAgentInputSchema = z.object({
  profileId: z.string().min(1).describe("子 Agent 配置 ID"),
  taskVars: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({})
    .describe("任务变量"),
  // Backward-compatible alias for older prompts/history.
  templateVars: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("任务变量（兼容旧字段）"),
  payloadRef: z
    .object({
      type: z.enum(["repos-range", "repos-list", "custom"]),
      data: z.unknown(),
    })
    .optional()
    .describe("任务载荷"),
});

export interface CreateSubAgentInput extends z.infer<typeof createSubAgentInputSchema> {}

function extractReposByPayload(repos: GitHubRepo[], payloadRef?: SubAgentPayloadRef): GitHubRepo[] {
  if (!payloadRef || payloadRef.type === "custom") {
    return repos;
  }

  if (payloadRef.type === "repos-range") {
    const data = payloadRef.data as { startIndex?: unknown; endIndex?: unknown };
    const startIndex = typeof data.startIndex === "number" ? Math.max(0, Math.floor(data.startIndex)) : 0;
    const endIndex = typeof data.endIndex === "number" ? Math.max(startIndex, Math.floor(data.endIndex)) : repos.length;
    return repos.slice(startIndex, endIndex);
  }

  if (payloadRef.type === "repos-list") {
    const data = payloadRef.data as { indexes?: unknown };
    const indexes = Array.isArray(data.indexes) ? data.indexes : [];
    const normalized = indexes
      .filter(index => typeof index === "number" && Number.isInteger(index))
      .map(index => Math.max(0, index as number))
      .filter(index => index < repos.length);
    return normalized.map(index => repos[index]);
  }

  return repos;
}

export function createCreateSubAgentTool(
  repos: GitHubRepo[],
  username: string,
  sessionId: string,
  parentAgentId: string,
  customParams?: Record<string, unknown>
) {
  return tool({
    description: "基于用户配置的 profile 创建子 Agent，按任务描述要求执行任务",
    inputSchema: createSubAgentInputSchema,
    execute: async (params: CreateSubAgentInput): Promise<CreateSubAgentTaskOutput & { __duration: number }> => {
      const startTime = Date.now();
      const manager = getSubAgentManager();
      const profiles = resolveEnabledProfilesForAgent(customParams);
      const profile = profiles.find(item => item.id === params.profileId);

      if (!profile) {
        throw new SubAgentConfigError(
          "SUBAGENT_PROFILE_NOT_FOUND",
          `Enabled profile "${params.profileId}" not found`
        );
      }

      const selectedRepos = extractReposByPayload(repos, params.payloadRef);
      const payloadData = params.payloadRef?.type === "repos-range"
        ? params.payloadRef.data as { startIndex?: unknown; endIndex?: unknown }
        : undefined;

      const builtinVars: Record<string, string | number | boolean> = {
        username,
        repos_count: selectedRepos.length,
        start_index: typeof payloadData?.startIndex === "number" ? payloadData.startIndex : 0,
        end_index: typeof payloadData?.endIndex === "number" ? payloadData.endIndex : selectedRepos.length,
      };
      const taskVars = params.taskVars && Object.keys(params.taskVars).length > 0
        ? params.taskVars
        : (params.templateVars || {});
      const resolvedVars = buildResolvedTemplateVars({
        userVars: taskVars,
        varSchema: profile.varSchema,
        builtinVars,
      });
      const taskText = renderTemplate(profile.taskDescriptionRequirement, resolvedVars);

      const result = manager.addTask(
        {
          task: taskText,
          repos: selectedRepos,
          username,
          progress: 0,
          parentAgentId,
          profileId: profile.id,
          profileVersion: profile.version,
          originTool: "createSubAgent",
          payloadRef: params.payloadRef,
          taskVars: resolvedVars,
          profileSnapshot: profile,
        },
        sessionId
      );

      return {
        ...result,
        __duration: Date.now() - startTime,
      };
    },
  });
}
