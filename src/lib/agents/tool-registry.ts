/**
 * Tool Registry
 *
 * 定义所有可用工具的元数据，用于 Agent 配置中的工具选择
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
  /** 是否默认启用 */
  defaultEnabled: boolean;
  /** 是否为核心工具（不可禁用） */
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
// Star Agent Tools
// ============================================================================

export const STAR_AGENT_TOOLS: ToolMeta[] = [
  {
    id: "searchRepositories",
    name: "搜索仓库",
    description: "根据关键字、语言、主题等条件搜索和过滤仓库",
    category: "search",
    defaultEnabled: true,
    isCore: true,
  },
  {
    id: "displayRepositories",
    name: "展示仓库",
    description: "以卡片形式展示选定的仓库列表",
    category: "display",
    defaultEnabled: true,
    isCore: true,
  },
  {
    id: "getRepositoryReadme",
    name: "获取 README",
    description: "获取仓库的 README 文档内容",
    category: "info",
    defaultEnabled: true,
  },
];

// ============================================================================
// Master Agent Tools
// ============================================================================

export const MASTER_AGENT_TOOLS: ToolMeta[] = [
  {
    id: "getAllRepos",
    name: "获取所有仓库",
    description: "获取全部仓库列表（仅当仓库数量 ≤ 200 时可用）",
    category: "search",
    defaultEnabled: true,
    isCore: true,
  },
  {
    id: "createSubAgent",
    name: "创建子 Agent",
    description: "创建子 Agent 来处理大量仓库（仓库数量 > 200 时使用）",
    category: "agent",
    defaultEnabled: true,
    isCore: true,
  },
  {
    id: "displayRepositories",
    name: "展示仓库",
    description: "以卡片形式展示选定的仓库列表",
    category: "display",
    defaultEnabled: true,
    isCore: true,
  },
];

// ============================================================================
// Registry
// ============================================================================

/**
 * Agent 工具映射
 */
export const AGENT_TOOLS_MAP: Record<string, ToolMeta[]> = {
  star: STAR_AGENT_TOOLS,
  master: MASTER_AGENT_TOOLS,
};

/**
 * 获取 Agent 的所有可用工具
 */
export function getAgentTools(agentId: string): ToolMeta[] {
  return AGENT_TOOLS_MAP[agentId] || [];
}

/**
 * 获取 Agent 的默认启用工具 ID 列表
 */
export function getDefaultEnabledTools(agentId: string): string[] {
  const tools = getAgentTools(agentId);
  return tools.filter((t) => t.defaultEnabled).map((t) => t.id);
}

/**
 * 获取 Agent 的核心工具 ID 列表（不可禁用）
 */
export function getCoreTools(agentId: string): string[] {
  const tools = getAgentTools(agentId);
  return tools.filter((t) => t.isCore).map((t) => t.id);
}

/**
 * 验证工具列表（确保核心工具始终启用）
 */
export function validateEnabledTools(agentId: string, enabledTools: string[]): string[] {
  const coreTools = getCoreTools(agentId);
  const validTools = new Set(enabledTools);

  // 确保核心工具始终存在
  for (const tool of coreTools) {
    validTools.add(tool);
  }

  return [...validTools];
}
