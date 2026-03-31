"use client";

import { useEffect } from "react";
import { Loader2Icon } from "lucide-react";
import { motion } from "motion/react";
import { useShallow } from "zustand/react/shallow";

import { useModelCatalog } from "@/hooks/use-model-catalog";
import { useSettingsStore } from "@/stores/settings-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ChatModelPicker() {
  const {
    defaultProviderId,
    defaultModelId,
    setDefaultProviderId,
    setDefaultModelId,
    setDefaultModelSelection,
  } = useSettingsStore(useShallow((state) => ({
    defaultProviderId: state.defaultProviderId,
    defaultModelId: state.defaultModelId,
    setDefaultProviderId: state.setDefaultProviderId,
    setDefaultModelId: state.setDefaultModelId,
    setDefaultModelSelection: state.setDefaultModelSelection,
  })));

  const {
    providers,
    models,
    isLoadingProviders,
    isLoadingModels,
  } = useModelCatalog(defaultProviderId);

  useEffect(() => {
    if (!defaultProviderId && providers.length > 0) {
      setDefaultProviderId(providers[0].id);
    }
  }, [defaultProviderId, providers, setDefaultProviderId]);

  useEffect(() => {
    if (!defaultProviderId || models.length === 0) {
      return;
    }

    if (!defaultModelId || !models.some((model) => model.id === defaultModelId)) {
      setDefaultModelSelection(defaultProviderId, models[0].id);
    }
  }, [defaultModelId, defaultProviderId, models, setDefaultModelSelection]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-center gap-2"
    >
      <div className="hidden text-xs text-muted-foreground lg:block">模型</div>
      <div className="flex items-center gap-2">
        <Select
          value={defaultProviderId}
          onValueChange={(providerId) => {
            setDefaultProviderId(providerId);
            setDefaultModelId("");
          }}
          disabled={isLoadingProviders}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="供应商" />
          </SelectTrigger>
          <SelectContent>
            {providers.map((provider) => (
              <SelectItem key={provider.id} value={provider.id}>
                {provider.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={defaultModelId}
          onValueChange={setDefaultModelId}
          disabled={!defaultProviderId || isLoadingModels || models.length === 0}
        >
          <SelectTrigger className="h-8 w-[210px] text-xs">
            <SelectValue placeholder="模型" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(isLoadingProviders || isLoadingModels) && (
          <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>
    </motion.div>
  );
}

