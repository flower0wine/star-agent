import dayjs from "dayjs";

import type { PatentRuntimeConfig } from "@/agents/patent/static-config";
import type {
  PatentParty,
  PatentProvider,
  PatentRecord,
  PatentSearchParams,
  PatentSearchResult,
} from "@/lib/patent/types";

interface SerpApiSearchMetadata {
  status?: string;
}

interface SerpApiSearchInformation {
  total_results?: number;
}

interface SerpApiOrganicResult {
  patent_id?: string;
  patent_link?: string;
  publication_number?: string;
  title?: string;
  snippet?: string;
  publication_date?: string;
  filing_date?: string;
  assignee?: string;
  inventor?: string;
}

interface SerpApiGooglePatentsResponse {
  search_metadata?: SerpApiSearchMetadata;
  search_information?: SerpApiSearchInformation;
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

function splitParties(value: string | undefined): PatentParty[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[;,]/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(name => ({ name }));
}

function parseIsoDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return undefined;
  }
  return parsed.format("YYYY-MM-DD");
}

function derivePatentId(result: SerpApiOrganicResult): string {
  if (result.publication_number?.trim()) {
    return result.publication_number.trim();
  }
  if (result.patent_id?.trim()) {
    return result.patent_id.trim();
  }
  return "UNKNOWN";
}

function toPatentRecord(result: SerpApiOrganicResult): PatentRecord {
  const patentId = derivePatentId(result);
  const patentDate = parseIsoDate(result.publication_date);
  const applicationDate = parseIsoDate(result.filing_date);

  return {
    patentId,
    title: result.title?.trim() || "(无标题)",
    abstract: result.snippet?.trim(),
    patentDate,
    applicationDate,
    assignees: splitParties(result.assignee),
    inventors: splitParties(result.inventor),
    cpcCodes: [],
    citationCount: undefined,
    sourceUrl: result.patent_link || `https://patents.google.com/patent/${encodeURIComponent(patentId)}`,
  };
}

function inDateRange(value: string | undefined, fromDate?: string, toDate?: string): boolean {
  if (!fromDate && !toDate) {
    return true;
  }

  const parsed = parseIsoDate(value);
  if (!parsed) {
    return false;
  }

  if (fromDate && parsed < fromDate) {
    return false;
  }
  if (toDate && parsed > toDate) {
    return false;
  }
  return true;
}

function filterByDateRange(records: PatentRecord[], fromDate?: string, toDate?: string): PatentRecord[] {
  if (!fromDate && !toDate) {
    return records;
  }

  return records.filter((record) => {
    if (inDateRange(record.patentDate, fromDate, toDate)) {
      return true;
    }
    return inDateRange(record.applicationDate, fromDate, toDate);
  });
}

function resolveSortParam(params: PatentSearchParams): "new" | "old" {
  const order = params.sortOrder || "desc";
  return order === "asc" ? "old" : "new";
}

function resolveDupsParam(dedupeMode: PatentRuntimeConfig["serpApi"]["dedupeMode"]): string | undefined {
  if (dedupeMode === "publication") {
    return "language";
  }
  return undefined;
}

function mapSearchParams(
  params: PatentSearchParams,
  runtimeConfig: PatentRuntimeConfig
): URLSearchParams {
  const query = params.query?.trim() || params.company?.trim() || "patent";
  const sort = resolveSortParam(params);
  const limit = Math.min(params.limit || runtimeConfig.maxResultsPerRequest, runtimeConfig.maxResultsPerRequest);
  const dups = resolveDupsParam(runtimeConfig.serpApi.dedupeMode);

  const searchParams = new URLSearchParams({
    engine: "google_patents",
    api_key: runtimeConfig.serpApi.apiKey || "",
    q: query,
    patents: "true",
    scholar: runtimeConfig.serpApi.includeScholar ? "true" : "false",
    sort,
    num: String(Math.min(limit, 100)),
  });

  if (params.company?.trim()) {
    searchParams.set("assignee", params.company.trim());
  }

  if (dups) {
    searchParams.set("dups", dups);
  }

  return searchParams;
}

function parseTotalHits(payload: SerpApiGooglePatentsResponse, fallback: number): number {
  const totalResults = payload.search_information?.total_results;
  if (typeof totalResults === "number" && Number.isFinite(totalResults)) {
    return totalResults;
  }
  return fallback;
}

export const serpApiGooglePatentsProvider: PatentProvider = {
  providerId: "serpapi-google-patents",

  async searchPatents(params: PatentSearchParams, runtimeConfig: PatentRuntimeConfig): Promise<PatentSearchResult> {
    const apiKey = runtimeConfig.serpApi.apiKey;
    if (!apiKey) {
      throw new Error("SerpApi Google Patents 需要在 Agent 设置中配置 API Key。");
    }

    const endpoint = runtimeConfig.serpApi.baseUrl.replace(/\/$/, "");
    const searchParams = mapSearchParams(params, runtimeConfig);
    const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
      method: "GET",
      signal: AbortSignal.timeout(runtimeConfig.requestTimeoutMs),
    });

    if (!response.ok) {
      const message = await response.text();
      if (response.status === 401) {
        throw new Error("SerpApi API Key 无效（401 Unauthorized）。");
      }
      if (response.status === 429) {
        throw new Error("SerpApi 请求额度不足或频率受限（429 Too Many Requests）。");
      }
      throw new Error(`SerpApi 请求失败 (${response.status}): ${message || "unknown"}`);
    }

    const payload = await response.json() as SerpApiGooglePatentsResponse;
    if (payload.error) {
      throw new Error(`SerpApi 返回错误: ${payload.error}`);
    }

    if (payload.search_metadata?.status === "Error") {
      throw new Error("SerpApi 搜索状态为 Error，请稍后重试。");
    }

    const normalizedFromDate = parseIsoDate(params.fromDate);
    const normalizedToDate = parseIsoDate(params.toDate);
    const limit = Math.min(params.limit || runtimeConfig.maxResultsPerRequest, runtimeConfig.maxResultsPerRequest);

    const mapped = (payload.organic_results || []).map(toPatentRecord);
    const filtered = filterByDateRange(mapped, normalizedFromDate, normalizedToDate);
    const patents = filtered.slice(0, limit);

    return {
      provider: "serpapi-google-patents",
      count: patents.length,
      totalHits: parseTotalHits(payload, filtered.length),
      patents,
      raw: {
        ...payload,
        timeFilterMode: "post-filter",
        requestedFromDate: normalizedFromDate,
        requestedToDate: normalizedToDate,
      },
    };
  },
};
