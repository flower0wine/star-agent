import dayjs from "dayjs";
import { tool } from "ai";
import { z } from "zod";

import type { PatentRuntimeConfig } from "@/agents/patent/static-config";
import { searchPatents } from "@/lib/patent";

export function createSearchPatentsTool(runtimeConfig: PatentRuntimeConfig) {
  return tool({
    description: "检索公开专利数据，支持关键词、公司、时间范围与排序",
    inputSchema: z.object({
      query: z.string().optional().describe("检索关键词，例如 'battery thermal management'"),
      company: z.string().optional().describe("公司或机构名称，例如 'Tesla'"),
      fromDate: z.string().optional().describe("起始日期，格式 YYYY-MM-DD"),
      toDate: z.string().optional().describe("结束日期，格式 YYYY-MM-DD"),
      limit: z.number().int().min(1).max(1000).optional().describe("返回条数"),
      sortBy: z.enum(["date", "citations"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
    execute: async (params) => {
      const defaultFromDate = dayjs(runtimeConfig.today)
        .subtract(runtimeConfig.defaultLookbackMonths, "month")
        .format("YYYY-MM-DD");

      const result = await searchPatents(
        {
          ...params,
          fromDate: params.fromDate || defaultFromDate,
          toDate: params.toDate || runtimeConfig.today,
        },
        runtimeConfig
      );

      return {
        provider: result.provider,
        count: result.count,
        totalHits: result.totalHits,
        timeRange: {
          fromDate: params.fromDate || defaultFromDate,
          toDate: params.toDate || runtimeConfig.today,
        },
        patents: result.patents,
      };
    },
  });
}
