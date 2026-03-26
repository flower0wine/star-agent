/**
 * Create Sub-Agent Tool
 *
 * Tool for creating and running sub-agents (StarAgent) to process repos.
 *
 * KEY CHANGE: This tool now returns immediately without waiting for the sub-agent to complete.
 * The sub-agent runs in the background and streams output via SSE.
 */

import { tool } from "ai";
import { z } from "zod";
import type { GitHubRepo } from "@/lib/github/api";
import { getSubAgentManager } from "@/lib/agents/sub-agent/manager";
import type { CreateSubAgentTaskOutput } from "@/lib/agents/sub-agent/types";

export interface CreateSubAgentInput {
  /** The task to delegate to the sub-agent */
  task: string;
  /** Start index of repos to process (0-based, inclusive) */
  startIndex: number;
  /** End index of repos to process (exclusive) */
  endIndex: number;
}

/**
 * Create Create Sub-Agent Tool
 *
 * Creates a tool that spawns a StarAgent sub-agent to process a slice of repos.
 *
 * IMPORTANT: This tool returns immediately after launching the sub-agent.
 * The sub-agent runs asynchronously and streams output via SSE.
 */
export function createCreateSubAgentTool(
  repos: GitHubRepo[],
  username: string,
  sessionId: string
) {
  return tool({
    description: "当需要处理的仓库数量大于 200 时，使用该工具创建子 Agent 来分配处理",
    inputSchema: z.object({
      task: z
        .string()
        .describe("要分配给子 Agent 的任务描述，如「找出所有的 AI 相关的仓库」"),
      startIndex: z
        .number()
        .int()
        .min(0)
        .describe("要处理的仓库起始索引（包含初始索引）"),
      endIndex: z
        .number()
        .int()
        .min(1)
        .describe("要处理的仓库结束索引（不包含结束索引）"),
    }),
    execute: async (params: CreateSubAgentInput): Promise<CreateSubAgentTaskOutput & { __duration: number }> => {
      const { task, startIndex, endIndex } = params;
      const startTime = Date.now();

      // Get repos slice by index range
      const subRepos = repos.slice(startIndex, endIndex);

      // Get SubAgentManager
      const manager = getSubAgentManager();

      // Add task to queue - IMMEDIATELY returns
      const result = manager.addTask(
        {
          task,
          repos: subRepos,
          username,
          progress: 0,
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
