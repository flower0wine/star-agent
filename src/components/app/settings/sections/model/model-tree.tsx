import { useDeferredValue, useMemo, useState } from "react";
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

/**
 * 方案说明：
 *
 * 原代码使用 useEffect + requestAnimationFrame 做逐步渲染，存在以下问题：
 * 1. useEffect 在绘制后运行，导致先闪烁全部内容再缩减
 * 2. rAF pump 速度太快（~64ms 完成），用户无法感知
 * 3. effect 依赖 filteredProviders 引用，父组件 re-render 会重启 pump
 *
 * 修复方案：
 * - 去掉手动 debounce，仅用 useDeferredValue 延迟过滤计算（二选一即可）
 * - 去掉 useEffect + rAF progressive rendering
 * - 直接在 useMemo 中限制首屏渲染数量（同步，无闪烁）
 * - 用 useDeferredValue 包裹过滤结果，React 自动处理渲染优先级
 *
 * 如果列表确实非常大（数百个 provider），建议使用 react-window 等虚拟滚动方案，
 * 而不是手动的 progressive rendering。
 */

/** 搜索时每个 provider 最多显示的模型数，避免一次渲染过多 DOM */
const MAX_MODELS_WHEN_SEARCHING = 50;

export function ModelTree({
  providers,
  selectedProviderId,
  selectedModelId,
  onSelectModel,
}: ModelTreeProps) {
  const [inputQuery, setInputQuery] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<string[]>([]);

  // 单层延迟即可：useDeferredValue 让输入保持响应，过滤计算在低优先级进行
  const deferredQuery = useDeferredValue(inputQuery);
  const trimmedQuery = deferredQuery.trim();

  // 过滤 — 仅在 deferredQuery 或 providers 变化时重新计算
  const filteredProviders = useMemo(
    () => filterProviderNodes(providers, deferredQuery),
    [providers, deferredQuery]
  );

  // 搜索时限制每个 provider 展示的模型数量（同步计算，不闪烁）
  const visibleProviders = useMemo(() => {
    if (!trimmedQuery) {
      return filteredProviders;
    }
    return filteredProviders.map((provider) => ({
      ...provider,
      matchedModels: provider.matchedModels.slice(0, MAX_MODELS_WHEN_SEARCHING),
    }));
  }, [filteredProviders, trimmedQuery]);

  // 搜索时自动展开所有匹配的 provider
  const effectiveExpandedProviders = useMemo(() => {
    if (trimmedQuery) {
      return visibleProviders.map((provider) => provider.id);
    }
    return expandedProviders;
  }, [expandedProviders, trimmedQuery, visibleProviders]);

  // 输入中但 deferred 还没跟上时，降低列表不透明度给用户视觉反馈
  const isStale = inputQuery !== deferredQuery;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="space-y-2 border-b px-4 py-3">
        <p className="text-sm font-medium">供应商与模型</p>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={inputQuery}
            onChange={(event) => setInputQuery(event.target.value)}
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
            if (!trimmedQuery) {
              setExpandedProviders(value);
            }
          }}
          className={cn("p-2 transition-opacity", isStale && "opacity-60")}
        >
          {visibleProviders.map((provider) => (
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
                    const isSelected
                      = provider.id === selectedProviderId && model.id === selectedModelId;

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
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              没有匹配的供应商或模型
            </div>
          )}
        </Accordion>
      </ScrollArea>
    </div>
  );
}