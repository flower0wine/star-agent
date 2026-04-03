/**
 * Patent Agent Configuration
 *
 * Metadata for the Patent Agent.
 */

export const patentAgent = {
  id: "patent",
  name: "Patent Agent",
  description: "检索并分析专利趋势，辅助判断技术与公司发展方向",
  icon: "📄",
} as const;

export type PatentAgentId = typeof patentAgent.id;
