import dayjs from "dayjs";

export interface CatalogModelCost {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
}

export interface CatalogModelLimit {
  context?: number;
  input?: number;
  output?: number;
}

export interface CatalogModelModalities {
  input: string[];
  output: string[];
}

export interface CatalogProviderModel {
  id: string;
  name: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  toolCall?: boolean;
  structuredOutput?: boolean;
  temperature?: boolean;
  knowledge?: string;
  releaseDate?: string;
  lastUpdated?: string;
  modalities?: CatalogModelModalities;
  openWeights?: boolean;
  cost?: CatalogModelCost;
  limit?: CatalogModelLimit;
}

export interface CatalogProviderSummary {
  id: string;
  name: string;
  npm?: string;
  api?: string;
  doc?: string;
  env: string[];
  modelCount: number;
  runtimeSupported: boolean;
}

export interface CatalogProviderDetails extends CatalogProviderSummary {
  models: CatalogProviderModel[];
}

interface RawCatalogModel {
  id: string;
  name?: string;
  family?: string;
  attachment?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  structured_output?: boolean;
  temperature?: boolean;
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  modalities?: {
    input?: string[];
    output?: string[];
  };
  open_weights?: boolean;
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  limit?: {
    context?: number;
    input?: number;
    output?: number;
  };
}

interface RawCatalogProvider {
  id: string;
  name: string;
  npm?: string;
  api?: string;
  doc?: string;
  env?: string[];
  models?: Record<string, RawCatalogModel>;
}

type RawCatalog = Record<string, RawCatalogProvider>;

const MODELS_CATALOG_URL = "https://models.dev/api.json";
const MODELS_CACHE_MINUTES = 30;

let cache: RawCatalog | null = null;
let cacheUpdatedAt = 0;

function toModelSummary(model: RawCatalogModel): CatalogProviderModel {
  return {
    id: model.id,
    name: model.name || model.id,
    family: model.family,
    attachment: model.attachment,
    reasoning: model.reasoning,
    toolCall: model.tool_call,
    structuredOutput: model.structured_output,
    temperature: model.temperature,
    knowledge: model.knowledge,
    releaseDate: model.release_date,
    lastUpdated: model.last_updated,
    modalities: model.modalities
      ? {
          input: model.modalities.input || [],
          output: model.modalities.output || [],
        }
      : undefined,
    openWeights: model.open_weights,
    cost: model.cost
      ? {
          input: model.cost.input,
          output: model.cost.output,
          cacheRead: model.cost.cache_read,
          cacheWrite: model.cost.cache_write,
        }
      : undefined,
    limit: model.limit
      ? {
          context: model.limit.context,
          input: model.limit.input,
          output: model.limit.output,
        }
      : undefined,
  };
}

function sortModels(models: CatalogProviderModel[]) {
  return models.toSorted(
    (a, b) => dayjs(b.lastUpdated || 0).valueOf() - dayjs(a.lastUpdated || 0).valueOf()
  );
}

function toProviderSummary(provider: RawCatalogProvider): CatalogProviderSummary {
  const models = provider.models ? Object.values(provider.models) : [];
  const runtimeSupported = provider.id === "openai" || provider.npm === "@ai-sdk/openai-compatible";

  return {
    id: provider.id,
    name: provider.name,
    npm: provider.npm,
    api: provider.api,
    doc: provider.doc,
    env: provider.env || [],
    modelCount: models.length,
    runtimeSupported,
  };
}

function toProviderDetails(provider: RawCatalogProvider): CatalogProviderDetails {
  const models = provider.models ? Object.values(provider.models).map(toModelSummary) : [];

  return {
    ...toProviderSummary(provider),
    models: sortModels(models),
  };
}

async function fetchCatalog(): Promise<RawCatalog> {
  const response = await fetch(MODELS_CATALOG_URL, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models catalog: ${response.status}`);
  }

  return response.json() as Promise<RawCatalog>;
}

export async function getModelsCatalog(): Promise<RawCatalog> {
  const now = dayjs().valueOf();
  const cacheExpireAt = dayjs(cacheUpdatedAt).add(MODELS_CACHE_MINUTES, "minute").valueOf();
  const isCacheValid = cache && now < cacheExpireAt;

  if (isCacheValid && cache) {
    return cache;
  }

  const catalog = await fetchCatalog();
  cache = catalog;
  cacheUpdatedAt = now;
  return catalog;
}

export async function getProviderSummaries(): Promise<CatalogProviderSummary[]> {
  const catalog = await getModelsCatalog();

  return Object.values(catalog)
    .map(toProviderSummary)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProviderDetails(providerId: string): Promise<CatalogProviderDetails | null> {
  const catalog = await getModelsCatalog();
  const provider = catalog[providerId];

  if (!provider) {
    return null;
  }

  return toProviderDetails(provider);
}

export async function getCatalogLiteProviders(): Promise<CatalogProviderDetails[]> {
  const catalog = await getModelsCatalog();

  return Object.values(catalog)
    .map(toProviderDetails)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProviderModel(providerId: string, modelId: string): Promise<CatalogProviderModel | null> {
  const provider = await getProviderDetails(providerId);
  if (!provider) {
    return null;
  }

  return provider.models.find((model) => model.id === modelId) || null;
}

