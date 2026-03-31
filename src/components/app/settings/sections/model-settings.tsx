import { useMemo } from "react";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useModelTreeCatalog } from "@/hooks/use-model-tree-catalog";
import { useSettingsStore } from "@/stores/settings-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

import { SettingsSectionShell } from "../settings-section-shell";
import { ModelDetails } from "./model/model-details";
import { ModelTree } from "./model/model-tree";

export function ModelSettingsSection() {
  const {
    defaultProviderId,
    defaultModelId,
    providerApiKeys,
    setDefaultModelSelection,
    setProviderApiKey,
  } = useSettingsStore(useShallow((state) => ({
    defaultProviderId: state.defaultProviderId,
    defaultModelId: state.defaultModelId,
    providerApiKeys: state.providerApiKeys,
    setDefaultModelSelection: state.setDefaultModelSelection,
    setProviderApiKey: state.setProviderApiKey,
  })));

  const {
    providers,
    isLoading,
    error,
  } = useModelTreeCatalog();

  const activeProvider = useMemo(() => {
    if (providers.length === 0) {
      return undefined;
    }

    const selected = providers.find((provider) => provider.id === defaultProviderId);
    return selected || providers[0];
  }, [defaultProviderId, providers]);

  const activeModel = useMemo(() => {
    if (!activeProvider || activeProvider.models.length === 0) {
      return undefined;
    }

    const selected = activeProvider.models.find((model) => model.id === defaultModelId);
    return selected || activeProvider.models[0];
  }, [activeProvider, defaultModelId]);

  const activeApiKey = activeProvider ? providerApiKeys[activeProvider.id] || "" : "";

  return (
    <SettingsSectionShell
      title="AI 模型"
      description="在一个树形列表中浏览供应商与模型，并查看详细参数。"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>模型目录加载失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading && providers.length === 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            正在加载供应商和模型目录...
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(320px,0.95fr)_minmax(420px,1.05fr)]">
          <ModelTree
            providers={providers}
            selectedProviderId={defaultProviderId}
            selectedModelId={defaultModelId}
            onSelectModel={setDefaultModelSelection}
          />

          <ScrollArea className="h-full min-h-0 rounded-xl border bg-card">
            <div className="p-4">
              {activeProvider && (
                <ModelDetails
                  provider={activeProvider}
                  model={activeModel}
                  apiKey={activeApiKey}
                  onApiKeyChange={(value) => setProviderApiKey(activeProvider.id, value)}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </SettingsSectionShell>
  );
}
