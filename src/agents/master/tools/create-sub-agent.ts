import { tool } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";
import { getSubAgentManager } from "@/lib/agents/sub-agent/manager";
import type {
  CreateSubAgentTaskOutput,
  SubAgentPayloadRef,
  SubAgentProfile,
  SubAgentTaskTemplate,
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
  templateId: z.string().min(1).describe("任务模板 ID"),
  templateVars: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .default({})
    .describe("模板变量"),
  payloadRef: z
    .object({
      type: z.enum(["repos-range", "repos-list", "custom"]),
      data: z.unknown(),
    })
    .optional()
    .describe("任务载荷"),
});

export interface CreateSubAgentInput extends z.infer<typeof createSubAgentInputSchema> {}

function findTemplate(profile: SubAgentProfile, templateId: string): SubAgentTaskTemplate {
  const template = profile.templates.find(item => item.id === templateId);
  if (!template) {
    throw new SubAgentConfigError(
      "SUBAGENT_TEMPLATE_INVALID",
      `Template "${templateId}" not found in profile "${profile.id}"`
    );
  }
  return template;
}

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
    description: "基于用户配置的 profile/template 创建子 Agent，执行模板化任务",
    inputSchema: createSubAgentInputSchema,
    execute: async (params: CreateSubAgentInput): Promise<CreateSubAgentTaskOutput & { __duration: number }> => {
      const startTime = Date.now();
      const manager = getSubAgentManager();
      const profiles = resolveEnabledProfilesForAgent(customParams, parentAgentId);
      const profile = profiles.find(item => item.id === params.profileId);

      if (!profile) {
        throw new SubAgentConfigError(
          "SUBAGENT_PROFILE_NOT_FOUND",
          `Enabled profile "${params.profileId}" not found for agent "${parentAgentId}"`
        );
      }

      const template = findTemplate(profile, params.templateId);
      const selectedRepos = extractReposByPayload(repos, params.payloadRef);
      const payloadData = params.payloadRef?.type === "repos-range"
        ? params.payloadRef.data as { startIndex?: unknown; endIndex?: unknown }
        : undefined;

      if (profile.limits.maxInputItems && selectedRepos.length > profile.limits.maxInputItems) {
        throw new SubAgentConfigError(
          "SUBAGENT_PAYLOAD_LIMIT_EXCEEDED",
          `Input items ${selectedRepos.length} exceed maxInputItems ${profile.limits.maxInputItems}`
        );
      }

      const builtinVars: Record<string, string | number | boolean> = {
        username,
        repos_count: selectedRepos.length,
        start_index: typeof payloadData?.startIndex === "number" ? payloadData.startIndex : 0,
        end_index: typeof payloadData?.endIndex === "number" ? payloadData.endIndex : selectedRepos.length,
      };
      const resolvedVars = buildResolvedTemplateVars({
        userVars: params.templateVars,
        varSchema: profile.varSchema,
        builtinVars,
      });
      const taskText = renderTemplate(template.instructionTemplate, resolvedVars);

      const result = manager.addTask(
        {
          task: taskText,
          repos: selectedRepos,
          username,
          progress: 0,
          parentAgentId,
          profileId: profile.id,
          templateId: template.id,
          profileVersion: profile.version,
          originTool: "createSubAgent",
          payloadRef: params.payloadRef,
          templateVars: resolvedVars,
          profileSnapshot: profile,
          templateSnapshot: template,
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
