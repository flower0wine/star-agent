/**
 * Master Agent Configuration
 *
 * Metadata for the Master Agent that orchestrates sub-agents
 */

export const masterAgent = {
  id: "master",
  name: "Master Agent",
  description: "智能分配任务给子 Agent 处理大型仓库列表",
  icon: "🧠",
} as const;

export type MasterAgentId = typeof masterAgent.id;
