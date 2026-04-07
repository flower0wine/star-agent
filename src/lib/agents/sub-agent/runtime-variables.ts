import dayjs from "dayjs";
import type { GitHubRepo } from "@/lib/github/api";

export type RuntimeTemplateVars = Record<string, string | number | boolean>;

export interface RuntimeVariableMeta {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
}

export const PREDEFINED_RUNTIME_VARIABLES: RuntimeVariableMeta[] = [
  { name: "username", type: "string", description: "当前用户的 GitHub 用户名" },
  { name: "repos_count", type: "number", description: "当前可访问仓库数量" },
  { name: "repos_context", type: "string", description: "仓库列表的结构化上下文文本" },
  { name: "task", type: "string", description: "主 Agent 派发给 SubAgent 的任务内容" },
  { name: "parent_agent_id", type: "string", description: "发起当前任务的父 Agent 标识" },
  { name: "current_date", type: "string", description: "当前日期（YYYY-MM-DD）" },
];

interface BuildRuntimeVariablesOptions {
  username: string;
  parentAgentId: string;
  task: string;
  repos: GitHubRepo[];
}

function formatReposForContext(repos: GitHubRepo[]): string {
  return repos
    .map((repo) => {
      const parts = [
        repo.full_name,
        repo.description || "无描述",
        `⭐${repo.stargazers_count}`,
        repo.language || "",
      ];
      return parts.join(" | ");
    })
    .join("\n");
}

export function buildSubAgentRuntimeVariables(options: BuildRuntimeVariablesOptions): RuntimeTemplateVars {
  const { username, parentAgentId, task, repos } = options;
  return {
    username,
    repos_count: repos.length,
    repos_context: formatReposForContext(repos),
    task,
    parent_agent_id: parentAgentId,
    current_date: dayjs().format("YYYY-MM-DD"),
  };
}
