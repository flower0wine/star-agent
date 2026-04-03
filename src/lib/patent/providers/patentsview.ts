import dayjs from "dayjs";
import type {
  PatentProvider,
  PatentSearchParams,
  PatentSearchResult,
  PatentRecord,
} from "@/lib/patent/types";
import type { PatentRuntimeConfig } from "@/agents/patent/static-config";

interface PatentsViewAssignee {
  assignee_organization?: string;
}

interface PatentsViewInventor {
  inventor_name_first?: string;
  inventor_name_last?: string;
}

interface PatentsViewCpc {
  cpc_subgroup_id?: string;
  cpc_group_id?: string;
  cpc_section_id?: string;
}

interface PatentsViewPatent {
  patent_id?: string;
  patent_title?: string;
  patent_abstract?: string;
  patent_date?: string;
  patent_application_date?: string;
  patent_num_times_cited_by_us_patents?: number;
  assignees?: PatentsViewAssignee[];
  inventors?: PatentsViewInventor[];
  cpcs?: PatentsViewCpc[];
}

interface PatentsViewResponse {
  count?: number;
  total_hits?: number;
  patents?: PatentsViewPatent[];
  error?: boolean;
}

function toPatentRecord(item: PatentsViewPatent): PatentRecord {
  const patentId = item.patent_id || "UNKNOWN";
  const assignees = (item.assignees || [])
    .map((entry) => (entry.assignee_organization || "").trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const inventors = (item.inventors || [])
    .map((entry) => [entry.inventor_name_first, entry.inventor_name_last].filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const cpcCodes = (item.cpcs || [])
    .map((entry) => entry.cpc_subgroup_id || entry.cpc_group_id || entry.cpc_section_id || "")
    .filter(Boolean);

  return {
    patentId,
    title: item.patent_title || "(无标题)",
    abstract: item.patent_abstract,
    patentDate: item.patent_date,
    applicationDate: item.patent_application_date,
    assignees,
    inventors,
    cpcCodes,
    citationCount: item.patent_num_times_cited_by_us_patents,
    sourceUrl: `https://patents.google.com/patent/${encodeURIComponent(patentId)}`,
  };
}

function buildPatentsViewQuery(params: PatentSearchParams) {
  const conditions: unknown[] = [];

  if (params.query) {
    conditions.push({
      _or: [
        { _text_all: { patent_title: params.query } },
        { _text_all: { patent_abstract: params.query } },
      ],
    });
  }

  if (params.company) {
    conditions.push({ _text_all: { "assignees.assignee_organization": params.company } });
  }

  if (params.fromDate) {
    conditions.push({ _gte: { patent_date: params.fromDate } });
  }

  if (params.toDate) {
    conditions.push({ _lte: { patent_date: params.toDate } });
  }

  if (conditions.length === 0) {
    return { _gte: { patent_date: "1900-01-01" } };
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { _and: conditions };
}

function sanitizeDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = dayjs(value);
  if (!normalized.isValid()) {
    return undefined;
  }
  return normalized.format("YYYY-MM-DD");
}

export const patentsViewProvider: PatentProvider = {
  providerId: "patentsview",

  async searchPatents(params: PatentSearchParams, runtimeConfig: PatentRuntimeConfig): Promise<PatentSearchResult> {
    const apiKey = runtimeConfig.patentsView.apiKey;
    if (!apiKey) {
      throw new Error("PatentsView 需要在 Agent 设置中配置 API Key (X-Api-Key)。");
    }

    const baseUrl = runtimeConfig.patentsView.baseUrl.replace(/\/$/, "");
    const limit = Math.min(params.limit || runtimeConfig.maxResultsPerRequest, runtimeConfig.maxResultsPerRequest);
    const sortByField = (params.sortBy || runtimeConfig.defaultSortBy) === "citations"
      ? "patent_num_times_cited_by_us_patents"
      : "patent_date";
    const sortOrder = params.sortOrder || "desc";
    const fromDate = sanitizeDate(params.fromDate);
    const toDate = sanitizeDate(params.toDate);

    const query = buildPatentsViewQuery({
      ...params,
      fromDate,
      toDate,
    });

    const searchParams = new URLSearchParams({
      q: JSON.stringify(query),
      f: JSON.stringify([
        "patent_id",
        "patent_title",
        "patent_abstract",
        "patent_date",
        "patent_application_date",
        "patent_num_times_cited_by_us_patents",
        "assignees.assignee_organization",
        "inventors.inventor_name_first",
        "inventors.inventor_name_last",
        "cpcs.cpc_subgroup_id",
      ]),
      s: JSON.stringify([{ [sortByField]: sortOrder }]),
      o: JSON.stringify({
        size: limit,
        exclude_withdrawn: true,
      }),
    });

    const endpoint = `${baseUrl}/patent/?${searchParams.toString()}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Api-Key": apiKey,
      },
      signal: AbortSignal.timeout(runtimeConfig.requestTimeoutMs),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`PatentsView 请求失败 (${response.status}): ${message || "unknown"}`);
    }

    const payload = await response.json() as PatentsViewResponse;
    const patents = (payload.patents || []).map(toPatentRecord);

    return {
      provider: "patentsview",
      count: payload.count || patents.length,
      totalHits: payload.total_hits || patents.length,
      patents,
      raw: payload,
    };
  },
};
