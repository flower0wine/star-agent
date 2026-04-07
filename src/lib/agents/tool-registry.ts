/**
 * Tool Registry (UI-facing)
 *
 * 基于 base/tool-definitions 提供工具目录与筛选辅助函数。
 */

import { listToolDefinitions } from "@/lib/agents/base/tool-definitions";
import type { ToolCategory } from "@/lib/agents/base/types";

export type { ToolCategory } from "@/lib/agents/base/types";

export interface ToolMeta {
  id: string;
  name: string;
  description: string;
  searchKeywords?: string[];
  category: ToolCategory;
  defaultEnabledAgentIds: string[];
  isCore?: boolean;
  subAgentCompatible?: boolean;
}

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

const TOOL_CATALOG: ToolMeta[] = listToolDefinitions().map(def => ({
  id: def.id,
  name: def.name,
  description: def.description,
  searchKeywords: def.searchKeywords,
  category: def.category,
  defaultEnabledAgentIds: def.defaultEnabledAgentIds,
  isCore: def.isCore,
  subAgentCompatible: def.subAgentCompatible,
}));

export function getAgentTools(agentId: string): ToolMeta[] {
  void agentId;
  return TOOL_CATALOG;
}

export function getAllTools(): ToolMeta[] {
  return TOOL_CATALOG;
}

export function getSubAgentCompatibleTools(): ToolMeta[] {
  return TOOL_CATALOG.filter(tool => tool.subAgentCompatible);
}

export function getDefaultEnabledTools(agentId: string): string[] {
  return TOOL_CATALOG
    .filter(tool => tool.defaultEnabledAgentIds.includes(agentId))
    .map(tool => tool.id);
}

export function getCoreTools(agentId: string): string[] {
  return TOOL_CATALOG
    .filter(tool => tool.isCore && tool.defaultEnabledAgentIds.includes(agentId))
    .map(tool => tool.id);
}
