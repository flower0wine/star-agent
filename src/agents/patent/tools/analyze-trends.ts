import { tool } from "ai";
import { z } from "zod";

import type { PatentRuntimeConfig } from "@/agents/patent/static-config";
import { analyzePatentTrends } from "@/lib/patent";

export function createAnalyzePatentTrendsTool(runtimeConfig: PatentRuntimeConfig) {
  return tool({
    description: "按公司统计专利趋势，用于判断技术投入方向和未来发展重点",
    inputSchema: z.object({
      company: z.string().min(1).describe("公司或机构名称，例如 'NVIDIA'"),
      months: z.number().int().min(1).max(120).optional().describe("分析窗口（月），默认使用 Agent 设置"),
    }),
    execute: async ({ company, months }) => {
      const analysis = await analyzePatentTrends(company, runtimeConfig, months);

      return {
        provider: analysis.provider,
        company: analysis.company,
        fromDate: analysis.fromDate,
        toDate: analysis.toDate,
        totalPatents: analysis.totalPatents,
        momentum: analysis.momentum,
        momentumDetail: analysis.momentumDetail,
        monthlyCounts: analysis.monthlyCounts,
        topCpcCodes: analysis.topCpcCodes,
        topKeywords: analysis.topKeywords,
        topAssignees: analysis.topAssignees,
      };
    },
  });
}
