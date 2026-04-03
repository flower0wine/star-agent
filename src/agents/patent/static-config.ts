/**
 * Patent Agent Static Configuration
 */

import dayjs from "dayjs";

// ============================================================================
// Types
// ============================================================================

export type PatentApiProvider = "patentsview" | "epo-ops" | "uspto-assignment";
export type PatentSortBy = "date" | "citations";

export interface PatentAgentStaticConfig {
  provider: PatentApiProvider;
  defaultLookbackMonths: number;
  maxResultsPerRequest: number;
  requestTimeoutMs: number;
  defaultSortBy: PatentSortBy;
}

export interface PatentAgentCustomParams {
  patentsViewApiKey?: string;
  patentsViewBaseUrl?: string;
  epoConsumerKey?: string;
  epoConsumerSecret?: string;
  usptoApiKey?: string;
  toolSelectionConfigured?: boolean;
}

export interface PatentRuntimeConfig {
  provider: PatentApiProvider;
  patentsView: {
    apiKey?: string;
    baseUrl: string;
  };
  epoOps: {
    consumerKey?: string;
    consumerSecret?: string;
  };
  uspto: {
    apiKey?: string;
  };
  defaultLookbackMonths: number;
  maxResultsPerRequest: number;
  requestTimeoutMs: number;
  defaultSortBy: PatentSortBy;
  today: string;
}

// ============================================================================
// Default Config
// ============================================================================

export const DEFAULT_PATENT_STATIC_CONFIG: PatentAgentStaticConfig = {
  provider: "patentsview",
  defaultLookbackMonths: 12,
  maxResultsPerRequest: 25,
  requestTimeoutMs: 15000,
  defaultSortBy: "date",
};

// ============================================================================
// Options
// ============================================================================

export const PATENT_PROVIDER_OPTIONS: Array<{
  value: PatentApiProvider;
  label: string;
  description: string;
}> = [
  {
    value: "patentsview",
    label: "PatentsView (美国专利)",
    description: "免费开放，支持结构化检索；需配置 X-Api-Key",
  },
  {
    value: "epo-ops",
    label: "EPO OPS (欧洲专利)",
    description: "免费额度 + OAuth2，需 Consumer Key/Secret",
  },
  {
    value: "uspto-assignment",
    label: "USPTO Assignment",
    description: "USPTO 开放数据方向配置（扩展预留）",
  },
];

export const PATENT_LOOKBACK_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 3, label: "最近 3 个月" },
  { value: 6, label: "最近 6 个月" },
  { value: 12, label: "最近 12 个月" },
  { value: 24, label: "最近 24 个月" },
];

export const PATENT_MAX_RESULTS_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10, label: "10 条" },
  { value: 25, label: "25 条" },
  { value: 50, label: "50 条" },
  { value: 100, label: "100 条" },
];

export const PATENT_SORT_OPTIONS: Array<{ value: PatentSortBy; label: string }> = [
  { value: "date", label: "按日期" },
  { value: "citations", label: "按被引次数" },
];

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(num)));
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readProvider(value: unknown): PatentApiProvider {
  return value === "epo-ops" || value === "uspto-assignment" || value === "patentsview"
    ? value
    : DEFAULT_PATENT_STATIC_CONFIG.provider;
}

function readSortBy(value: unknown): PatentSortBy {
  return value === "citations" || value === "date" ? value : DEFAULT_PATENT_STATIC_CONFIG.defaultSortBy;
}

export function resolvePatentRuntimeConfig(
  staticParams?: Record<string, unknown>,
  customParams?: Record<string, unknown>
): PatentRuntimeConfig {
  const typedCustom = (customParams || {}) as PatentAgentCustomParams;
  const typedStatic = staticParams || {};

  const provider = readProvider(typedStatic.provider);
  const defaultLookbackMonths = clampInteger(
    typedStatic.defaultLookbackMonths,
    DEFAULT_PATENT_STATIC_CONFIG.defaultLookbackMonths,
    1,
    120
  );
  const maxResultsPerRequest = clampInteger(
    typedStatic.maxResultsPerRequest,
    DEFAULT_PATENT_STATIC_CONFIG.maxResultsPerRequest,
    1,
    1000
  );
  const requestTimeoutMs = clampInteger(
    typedStatic.requestTimeoutMs,
    DEFAULT_PATENT_STATIC_CONFIG.requestTimeoutMs,
    1000,
    120000
  );
  const defaultSortBy = readSortBy(typedStatic.defaultSortBy);

  return {
    provider,
    patentsView: {
      apiKey: readString(typedCustom.patentsViewApiKey),
      baseUrl: readString(typedCustom.patentsViewBaseUrl) || "https://search.patentsview.org/api/v1",
    },
    epoOps: {
      consumerKey: readString(typedCustom.epoConsumerKey),
      consumerSecret: readString(typedCustom.epoConsumerSecret),
    },
    uspto: {
      apiKey: readString(typedCustom.usptoApiKey),
    },
    defaultLookbackMonths,
    maxResultsPerRequest,
    requestTimeoutMs,
    defaultSortBy,
    today: dayjs().format("YYYY-MM-DD"),
  };
}

