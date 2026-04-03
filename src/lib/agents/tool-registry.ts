/**
 * Tool Registry
 *
 * 集中定义所有可用工具元数据，并维护 Agent 与工具的映射关系
 */

// ============================================================================
// Types
// ============================================================================

/**
 * 工具元数据
 */
export interface ToolMeta {
  /** 工具 ID（与实际工具名称匹配） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具分类 */
  category: ToolCategory;
  /** 适用的 Agent */
  agentIds: string[];
  /** 默认启用的 Agent */
  defaultEnabledAgentIds: string[];
  /** 是否为核心工具（仅标记，不做强制限制） */
  isCore?: boolean;
}

/**
 * 工具分类
 */
export type ToolCategory = "search" | "display" | "info" | "agent";

/**
 * 分类显示信息
 */
export const TOOL_CATEGORIES: Record<ToolCategory, { label: string; description: string }> = {
  search: {
    label: "搜索工具",
    description: "用于搜索和过滤仓库",
  },
  display: {
    label: "展示工具",
    description: "用于展示仓库信息",
  },
  info: {
    label: "信息工具",
    description: "用于获取详细信息",
  },
  agent: {
    label: "Agent 工具",
    description: "用于 Agent 协作",
  },
};

// ============================================================================
// Centralized Tool Catalog
// ============================================================================

export const TOOL_CATALOG: ToolMeta[] = [
  {
    id: "searchRepositories",
    name: "搜索仓库",
    description: "根据关键字、语言、主题等条件搜索和过滤仓库",
    category: "search",
    agentIds: ["star"],
    defaultEnabledAgentIds: ["star"],
    isCore: true,
  },
  {
    id: "displayRepositories",
    name: "展示仓库",
    description: "以卡片形式展示选定的仓库列表",
    category: "display",
    agentIds: ["star", "master"],
    defaultEnabledAgentIds: ["star", "master"],
    isCore: true,
  },
  {
    id: "getRepositoryReadme",
    name: "获取 README",
    description: "获取仓库的 README 文档内容",
    category: "info",
    agentIds: ["star"],
    defaultEnabledAgentIds: ["star"],
  },
  {
    id: "getAllRepos",
    name: "获取所有仓库",
    description: "获取全部仓库列表（仅当仓库数量 ≤ 200 时可用）",
    category: "search",
    agentIds: ["master"],
    defaultEnabledAgentIds: ["master"],
    isCore: true,
  },
  {
    id: "createSubAgent",
    name: "创建子 Agent",
    description: "创建子 Agent 来处理大量仓库（仓库数量 > 200 时使用）",
    category: "agent",
    agentIds: ["master"],
    defaultEnabledAgentIds: ["master"],
    isCore: true,
  },
  {
    id: "searchPatents",
    name: "检索专利",
    description: "按关键词、公司和时间范围检索公开专利",
    category: "search",
    agentIds: ["patent"],
    defaultEnabledAgentIds: ["patent"],
    isCore: true,
  },
  {
    id: "analyzePatentTrends",
    name: "分析专利趋势",
    description: "按公司聚合专利趋势，辅助判断未来技术方向",
    category: "info",
    agentIds: ["patent"],
    defaultEnabledAgentIds: ["patent"],
    isCore: true,
  },
];

// ============================================================================
// Registry Helpers
// ============================================================================

/**
 * 获取 Agent 的所有可用工具
 */
export function getAgentTools(agentId: string): ToolMeta[] {
  return TOOL_CATALOG.filter((tool) => tool.agentIds.includes(agentId));
}

/**
 * 获取全量工具目录
 */
export function getAllTools(): ToolMeta[] {
  return TOOL_CATALOG;
}

/**
 * 获取 Agent 的默认启用工具 ID 列表
 */
export function getDefaultEnabledTools(agentId: string): string[] {
  const tools = getAgentTools(agentId);
  return tools
    .filter((tool) => tool.defaultEnabledAgentIds.includes(agentId))
    .map((tool) => tool.id);
}

/**
 * 获取 Agent 的核心工具 ID 列表（仅标记用途）
 */
export function getCoreTools(agentId: string): string[] {
  const tools = getAgentTools(agentId);
  return tools.filter((t) => t.isCore).map((t) => t.id);
}

/**
 * 标准化启用工具列表（去重 + 仅保留该 Agent 支持的工具）
 */
export function normalizeEnabledTools(agentId: string, enabledTools: string[]): string[] {
  const availableToolIds = new Set(getAgentTools(agentId).map((tool) => tool.id));
  const normalized = new Set<string>();
  for (const toolId of enabledTools) {
    if (availableToolIds.has(toolId)) {
      normalized.add(toolId);
    }
  }
  return [...normalized];
}

