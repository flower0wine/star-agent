import { createDisplayRepositoriesTool } from "@/agents/star/tools/display-repositories";
import { createGetRepositoryReadmeTool } from "@/agents/star/tools/get-readme";
import { createSearchRepositoriesTool } from "@/agents/star/tools/search-repository";
import { createGetAllReposTool } from "@/agents/master/tools/get-all-repos";
import { createCreateSubAgentTool } from "@/agents/master/tools/create-sub-agent";
import { createSearchPatentsTool } from "@/agents/patent/tools/search-patents";
import { createAnalyzePatentTrendsTool } from "@/agents/patent/tools/analyze-trends";
import { resolvePatentRuntimeConfig } from "@/agents/patent/static-config";
import type { ToolDefinition } from "./types";

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "searchRepositories",
    name: "搜索仓库",
    description: "根据关键字、语言、主题等条件搜索和过滤仓库",
    searchKeywords: ["repo", "search", "language", "topic"],
    category: "search",
    defaultEnabledAgentIds: ["star"],
    isCore: true,
    subAgentCompatible: true,
    factory: context => createSearchRepositoriesTool(context.repos),
  },
  {
    id: "displayRepositories",
    name: "展示仓库",
    description: "以卡片形式展示选定的仓库列表",
    searchKeywords: ["repo", "display", "list", "card"],
    category: "display",
    defaultEnabledAgentIds: ["star", "master"],
    isCore: true,
    subAgentCompatible: true,
    factory: context => createDisplayRepositoriesTool(context.repos),
  },
  {
    id: "getRepositoryReadme",
    name: "获取 README",
    description: "获取仓库的 README 文档内容",
    searchKeywords: ["repo", "readme", "content"],
    category: "info",
    defaultEnabledAgentIds: ["star"],
    subAgentCompatible: true,
    factory: context => createGetRepositoryReadmeTool(context.repos),
  },
  {
    id: "getAllRepos",
    name: "获取所有仓库",
    description: "获取全部仓库列表（仅当仓库数量 ≤ 200 时可用）",
    searchKeywords: ["repo", "all", "list"],
    category: "search",
    defaultEnabledAgentIds: ["master"],
    isCore: true,
    subAgentCompatible: true,
    factory: context => createGetAllReposTool(context.repos),
  },
  {
    id: "createSubAgent",
    name: "创建子 Agent",
    description: "创建子 Agent 来处理大量仓库（仓库数量 > 200 时使用）",
    searchKeywords: ["subagent", "dispatch", "parallel"],
    category: "agent",
    defaultEnabledAgentIds: ["master"],
    isCore: true,
    subAgentCompatible: false,
    factory: context => createCreateSubAgentTool(
      context.repos,
      context.username || "unknown",
      context.requestId,
      context.agentId,
      context.customParams,
      context.toolConfig
    ),
  },
  {
    id: "searchPatents",
    name: "检索专利",
    description: "按关键词、公司和时间范围检索公开专利",
    searchKeywords: ["patent", "search", "company", "time"],
    category: "search",
    defaultEnabledAgentIds: ["patent"],
    isCore: true,
    subAgentCompatible: false,
    factory: context => createSearchPatentsTool(context.patentRuntimeConfig!),
  },
  {
    id: "analyzePatentTrends",
    name: "分析专利趋势",
    description: "按公司聚合专利趋势，辅助判断未来技术方向",
    searchKeywords: ["patent", "trend", "analysis"],
    category: "info",
    defaultEnabledAgentIds: ["patent"],
    isCore: true,
    subAgentCompatible: false,
    factory: context => createAnalyzePatentTrendsTool(context.patentRuntimeConfig!),
  },
];

const DEFINITION_MAP = new Map(TOOL_DEFINITIONS.map(def => [def.id, def]));

export function listToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return DEFINITION_MAP.get(toolId);
}

export function getToolInputSchema(toolId: string): unknown {
  const definition = getToolDefinition(toolId);
  if (!definition) {
    return undefined;
  }

  const dummyTool = definition.factory({
    agentId: "star",
    requestId: "settings-preview",
    repos: [],
    username: "preview-user",
    customParams: {},
    staticParams: {},
    patentRuntimeConfig: resolvePatentRuntimeConfig({}, {}),
  }) as {
    inputSchema?: unknown;
  };

  return dummyTool.inputSchema;
}
