import dayjs from "dayjs";

import type { PatentRuntimeConfig } from "@/agents/patent/static-config";
import type {
  PatentProvider,
  PatentSearchParams,
  PatentSearchResult,
  PatentTrendAnalysis,
  RankedItem,
} from "./types";
import { patentsViewProvider } from "./providers/patentsview";
import { serpApiGooglePatentsProvider } from "./providers/serpapi-google-patents";

const providers: Record<string, PatentProvider> = {
  "patentsview": patentsViewProvider,
  "serpapi-google-patents": serpApiGooglePatentsProvider,
};

function ensureProvider(runtimeConfig: PatentRuntimeConfig): PatentProvider {
  const provider = providers[runtimeConfig.provider];
  if (provider) {
    return provider;
  }

  if (runtimeConfig.provider === "epo-ops") {
    throw new Error("当前版本已完成 EPO OPS 配置入口，但检索能力尚未接入。请先切换到 PatentsView。");
  }

  if (runtimeConfig.provider === "uspto-assignment") {
    throw new Error("当前版本已完成 USPTO 配置入口，但检索能力尚未接入。请先切换到 PatentsView。");
  }

  throw new Error(`未支持的专利 Provider: ${runtimeConfig.provider}`);
}

function rankMap(map: Map<string, number>, topN: number): RankedItem[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => ({ key, count }));
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "of",
  "to",
  "in",
  "on",
  "by",
  "with",
  "method",
  "system",
  "device",
  "apparatus",
  "based",
]);

function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

export async function searchPatents(
  params: PatentSearchParams,
  runtimeConfig: PatentRuntimeConfig
): Promise<PatentSearchResult> {
  const provider = ensureProvider(runtimeConfig);
  return provider.searchPatents(params, runtimeConfig);
}

export async function analyzePatentTrends(
  company: string,
  runtimeConfig: PatentRuntimeConfig,
  months?: number
): Promise<PatentTrendAnalysis> {
  const lookbackMonths = Math.max(1, Math.min(months || runtimeConfig.defaultLookbackMonths, 120));
  const endDate = dayjs(runtimeConfig.today);
  const startDate = endDate.subtract(lookbackMonths, "month");

  const result = await searchPatents(
    {
      company,
      fromDate: startDate.format("YYYY-MM-DD"),
      toDate: endDate.format("YYYY-MM-DD"),
      sortBy: "date",
      sortOrder: "desc",
      limit: Math.min(500, Math.max(50, runtimeConfig.maxResultsPerRequest * 5)),
    },
    runtimeConfig
  );

  const monthMap = new Map<string, number>();
  for (let i = 0; i <= lookbackMonths; i += 1) {
    const key = startDate.add(i, "month").format("YYYY-MM");
    monthMap.set(key, 0);
  }

  const cpcMap = new Map<string, number>();
  const keywordMap = new Map<string, number>();
  const assigneeMap = new Map<string, number>();

  for (const patent of result.patents) {
    const dateKey = patent.patentDate ? dayjs(patent.patentDate).format("YYYY-MM") : "";
    if (dateKey && monthMap.has(dateKey)) {
      monthMap.set(dateKey, (monthMap.get(dateKey) || 0) + 1);
    }

    for (const code of patent.cpcCodes) {
      cpcMap.set(code, (cpcMap.get(code) || 0) + 1);
    }

    for (const keyword of extractKeywords(patent.title)) {
      keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
    }

    for (const assignee of patent.assignees) {
      const key = assignee.name.trim();
      if (!key) {
        continue;
      }
      assigneeMap.set(key, (assigneeMap.get(key) || 0) + 1);
    }
  }

  const monthlyCounts = Array.from(monthMap.entries(), ([month, count]) => ({ month, count }));
  const recentWindow = monthlyCounts.slice(-3);
  const previousWindow = monthlyCounts.slice(-6, -3);
  const recentSum = recentWindow.reduce((sum, item) => sum + item.count, 0);
  const previousSum = previousWindow.reduce((sum, item) => sum + item.count, 0);

  let momentum: PatentTrendAnalysis["momentum"] = "flat";
  let momentumDetail = "近 6 个月申请趋势整体平稳";

  if (recentSum > previousSum * 1.15) {
    momentum = "up";
    momentumDetail = `最近 3 个月（${recentSum}）相比前 3 个月（${previousSum}）明显上升`;
  } else if (previousSum > 0 && recentSum < previousSum * 0.85) {
    momentum = "down";
    momentumDetail = `最近 3 个月（${recentSum}）相比前 3 个月（${previousSum}）下降`;
  }

  return {
    provider: runtimeConfig.provider,
    company,
    fromDate: startDate.format("YYYY-MM-DD"),
    toDate: endDate.format("YYYY-MM-DD"),
    totalPatents: result.totalHits,
    monthlyCounts,
    topCpcCodes: rankMap(cpcMap, 10),
    topKeywords: rankMap(keywordMap, 15),
    topAssignees: rankMap(assigneeMap, 10),
    momentum,
    momentumDetail,
  };
}

