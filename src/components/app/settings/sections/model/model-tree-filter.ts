import type { CatalogProviderDetails } from "@/lib/models/catalog";

export interface FilteredProviderNode extends CatalogProviderDetails {
  matchedModels: CatalogProviderDetails["models"];
}

export function filterProviderNodes(
  providers: CatalogProviderDetails[],
  query: string
): FilteredProviderNode[] {
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return providers.map((provider) => ({
      ...provider,
      matchedModels: provider.models,
    }));
  }

  const filtered = providers.map((provider) => {
    const providerHit = `${provider.name} ${provider.id}`.toLowerCase().includes(keyword);

    const matchedModels = provider.models.filter((model) => {
      const text = `${model.name} ${model.id} ${model.family || ""}`.toLowerCase();
      return text.includes(keyword);
    });

    if (providerHit) {
      return {
        ...provider,
        matchedModels: provider.models,
      };
    }

    return {
      ...provider,
      matchedModels,
    };
  });

  return filtered.filter((provider) => provider.matchedModels.length > 0);
}
