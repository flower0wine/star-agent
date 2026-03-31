"use client";

import { useEffect, useState } from "react";

import type { CatalogProviderDetails } from "@/lib/models/catalog";

interface UseModelTreeCatalogResult {
  providers: CatalogProviderDetails[];
  isLoading: boolean;
  error: string | null;
}

export function useModelTreeCatalog(): UseModelTreeCatalogResult {
  const [providers, setProviders] = useState<CatalogProviderDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/models/catalog-lite", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to load catalog lite (${response.status})`);
        }

        const data = (await response.json()) as { providers: CatalogProviderDetails[] };
        setProviders(data.providers || []);
      } catch (err) {
        console.error("Failed to load model tree catalog:", err);
        setError("加载模型目录失败");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return {
    providers,
    isLoading,
    error,
  };
}
