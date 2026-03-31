"use client";

import { useEffect, useMemo, useState } from "react";

import type { CatalogProviderDetails, CatalogProviderSummary } from "@/lib/models/catalog";

interface UseModelCatalogResult {
  providers: CatalogProviderSummary[];
  selectedProvider: CatalogProviderSummary | undefined;
  models: CatalogProviderDetails["models"];
  isLoadingProviders: boolean;
  isLoadingModels: boolean;
  error: string | null;
}

export function useModelCatalog(providerId?: string): UseModelCatalogResult {
  const [providers, setProviders] = useState<CatalogProviderSummary[]>([]);
  const [models, setModels] = useState<CatalogProviderDetails["models"]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      setIsLoadingProviders(true);
      setError(null);

      try {
        const response = await fetch("/api/models/providers", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load providers (${response.status})`);
        }

        const data = (await response.json()) as { providers: CatalogProviderSummary[] };
        setProviders(data.providers || []);
      } catch (err) {
        console.error("Failed to load model providers:", err);
        setError("加载模型供应商失败");
      } finally {
        setIsLoadingProviders(false);
      }
    };

    void loadProviders();
  }, []);

  useEffect(() => {
    if (!providerId) {
      setModels([]);
      return;
    }

    const loadModels = async () => {
      setIsLoadingModels(true);
      setError(null);

      try {
        const response = await fetch(`/api/models/providers/${providerId}/models`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load provider models (${response.status})`);
        }

        const data = (await response.json()) as { provider: CatalogProviderDetails };
        setModels(data.provider?.models || []);
      } catch (err) {
        console.error("Failed to load provider models:", err);
        setError("加载模型列表失败");
      } finally {
        setIsLoadingModels(false);
      }
    };

    void loadModels();
  }, [providerId]);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === providerId),
    [providers, providerId]
  );

  return {
    providers,
    selectedProvider,
    models,
    isLoadingProviders,
    isLoadingModels,
    error,
  };
}
