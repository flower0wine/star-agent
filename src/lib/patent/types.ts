import type { PatentApiProvider, PatentSortBy, PatentRuntimeConfig } from "@/agents/patent/static-config";

export interface PatentParty {
  name: string;
}

export interface PatentRecord {
  patentId: string;
  title: string;
  abstract?: string;
  patentDate?: string;
  applicationDate?: string;
  assignees: PatentParty[];
  inventors: PatentParty[];
  cpcCodes: string[];
  citationCount?: number;
  sourceUrl?: string;
}

export interface PatentSearchParams {
  query?: string;
  company?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  sortBy?: PatentSortBy;
  sortOrder?: "asc" | "desc";
}

export interface PatentSearchResult {
  provider: PatentApiProvider;
  count: number;
  totalHits: number;
  patents: PatentRecord[];
  raw?: unknown;
}

export interface PatentMonthlyCount {
  month: string;
  count: number;
}

export interface RankedItem {
  key: string;
  count: number;
}

export interface PatentTrendAnalysis {
  provider: PatentApiProvider;
  company: string;
  fromDate: string;
  toDate: string;
  totalPatents: number;
  monthlyCounts: PatentMonthlyCount[];
  topCpcCodes: RankedItem[];
  topKeywords: RankedItem[];
  topAssignees: RankedItem[];
  momentum: "up" | "down" | "flat";
  momentumDetail: string;
}

export interface PatentProvider {
  readonly providerId: PatentApiProvider;
  searchPatents: (
    params: PatentSearchParams,
    runtimeConfig: PatentRuntimeConfig
  ) => Promise<PatentSearchResult>;
}
