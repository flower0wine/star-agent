import { tool } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";
import { getSubAgentManager } from "@/lib/agents/sub-agent/manager";
import type {
  CreateSubAgentTaskOutput,
} from "@/lib/agents/sub-agent/types";
import type { AgentToolConfig } from "@/lib/agents/base/types";
import { buildSubAgentRuntimeVariables } from "@/lib/agents/sub-agent/runtime-variables";
import { resolveBoundSubAgentProfile } from "@/lib/agents/sub-agent/bindings";
import { buildResolvedTemplateVars } from "@/lib/agents/sub-agent/template-renderer";

const createSubAgentInputSchema = z.object({
  task: z.string().min(1).describe("派发给 SubAgent 的任务描述"),
});

export interface CreateSubAgentInput extends z.infer<typeof createSubAgentInputSchema> {}

export function createCreateSubAgentTool(
  repos: GitHubRepo[],
  username: string,
  sessionId: string,
  parentAgentId: string,
  customParams?: Record<string, unknown>,
  toolConfig?: AgentToolConfig
) {
  return tool({
    description: "使用预配置绑定的 SubAgent 创建异步子任务并执行",
    inputSchema: createSubAgentInputSchema,
    execute: async (params: CreateSubAgentInput): Promise<CreateSubAgentTaskOutput & { __duration: number }> => {
      const startTime = Date.now();
      const manager = getSubAgentManager();
      const profile = resolveBoundSubAgentProfile({
        customParams,
        toolConfig,
      });
      const runtimeVars = buildSubAgentRuntimeVariables({
        username,
        parentAgentId,
        task: params.task,
        repos,
      });
      const resolvedVars = buildResolvedTemplateVars({
        runtimeVars,
        varSchema: profile.varSchema,
      });

      const result = manager.addTask(
        {
          task: params.task,
          repos,
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
    },
  });
}
