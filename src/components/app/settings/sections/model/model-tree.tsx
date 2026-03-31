import { useMemo, useState } from "react";
import { BotIcon, BrainCircuitIcon, SearchIcon } from "lucide-react";

import type { CatalogProviderDetails } from "@/lib/models/catalog";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

import { formatTokenNumber, formatUsdPerMillion } from "./formatters";
import { filterProviderNodes } from "./model-tree-filter";

interface ModelTreeProps {
  providers: CatalogProviderDetails[];
  selectedProviderId: string;
  selectedModelId: string;
  onSelectModel: (providerId: string, modelId: string) => void;
}

export function ModelTree({
  providers,
  selectedProviderId,
  selectedModelId,
  onSelectModel,
}: ModelTreeProps) {
  const [query, setQuery] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<string[]>([]);

  const filteredProviders = useMemo(
    () => filterProviderNodes(providers, query),
    [providers, query]
  );

  const effectiveExpandedProviders = useMemo(() => {
    if (query.trim()) {
      return filteredProviders.map((provider) => provider.id);
    }

    return expandedProviders;
  }, [expandedProviders, filteredProviders, query]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="space-y-2 border-b px-4 py-3">
        <p className="text-sm font-medium">供应商与模型</p>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索供应商或模型"
            className="h-9 pl-8"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <Accordion
          type="multiple"
          value={effectiveExpandedProviders}
          onValueChange={(value) => {
            if (!query.trim()) {
              setExpandedProviders(value);
            }
          }}
          className="p-2"
        >
          {filteredProviders.map((provider) => (
            <AccordionItem key={provider.id} value={provider.id} className="border-none">
              <AccordionTrigger className="rounded-lg px-3 py-2 hover:no-underline hover:bg-muted">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{provider.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {provider.id} · {provider.matchedModels.length} 模型
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-1 pt-1">
                <div className="space-y-1">
                  {provider.matchedModels.map((model) => {
                    const isSelected = provider.id === selectedProviderId && model.id === selectedModelId;

                    return (
                      <button
                        key={`${provider.id}:${model.id}`}
                        type="button"
                        onClick={() => onSelectModel(provider.id, model.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                          isSelected
                            ? "border-primary/40 bg-primary/10"
                            : "border-transparent hover:bg-muted"
                        )}
                      >
                        <div className="truncate text-sm font-medium">{model.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{model.id}</div>
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                          {model.reasoning && (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                              <BrainCircuitIcon className="size-3" />
                              Reasoning
                            </span>
                          )}
                          {model.toolCall && (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                              <BotIcon className="size-3" />
                              Tool
                            </span>
                          )}
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5">
                            Context {formatTokenNumber(model.limit?.context)}
                          </span>
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5">
                            In {formatUsdPerMillion(model.cost?.input)}
                          </span>
                          <span className="inline-flex rounded bg-muted px-1.5 py-0.5">
                            Out {formatUsdPerMillion(model.cost?.output)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}

          {filteredProviders.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">没有匹配的供应商或模型</div>
          )}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
