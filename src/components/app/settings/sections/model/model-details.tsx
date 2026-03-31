import { Code2Icon, CoinsIcon, DatabaseIcon, KeyRoundIcon, LayersIcon } from "lucide-react";

import type { CatalogProviderModel, CatalogProviderSummary } from "@/lib/models/catalog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { formatDate, formatTokenNumber, formatUsdPerMillion } from "./formatters";

interface ModelDetailsProps {
  provider: CatalogProviderSummary;
  model: CatalogProviderModel | undefined;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

export function ModelDetails({ provider, model, apiKey, onApiKeyChange }: ModelDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-3">
          <img
            src={`https://models.dev/logos/${provider.id}.svg`}
            alt={`${provider.name} logo`}
            className="size-8 rounded-md border bg-background p-1"
          />
          <div>
            <div className="text-sm font-semibold">{provider.name}</div>
            <div className="text-xs text-muted-foreground">{provider.id}</div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider-api-key" className="inline-flex items-center gap-1.5">
            <KeyRoundIcon className="size-3.5" />
            {provider.env[0] || `${provider.id.toUpperCase()}_API_KEY`}
          </Label>
          <Input
            id="provider-api-key"
            type="password"
            placeholder="输入该供应商的 API Key"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">API Key 仅保存在本地浏览器。</p>
          {provider.doc && (
            <a href={provider.doc} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
              查看官方模型文档
            </a>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        {!model
          ? (
              <div className="text-sm text-muted-foreground">请选择一个模型查看详细信息。</div>
            )
          : (
              <div className="space-y-4">
                <div>
                  <div className="text-base font-semibold">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.id}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <InfoPill label="Reasoning" value={model.reasoning ? "支持" : "不支持"} />
                  <InfoPill label="Tool Calling" value={model.toolCall ? "支持" : "不支持"} />
                  <InfoPill label="多模态输入" value={model.attachment ? "支持" : "不支持"} />
                  <InfoPill label="开源权重" value={model.openWeights ? "是" : "否"} />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <section className="rounded-lg border bg-background p-3">
                    <div className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <CoinsIcon className="size-3.5" />
                      费用（USD / 1M tokens）
                    </div>
                    <div className="space-y-1 text-xs">
                      <Row label="Input" value={formatUsdPerMillion(model.cost?.input)} />
                      <Row label="Output" value={formatUsdPerMillion(model.cost?.output)} />
                      <Row label="Cache Read" value={formatUsdPerMillion(model.cost?.cacheRead)} />
                      <Row label="Cache Write" value={formatUsdPerMillion(model.cost?.cacheWrite)} />
                    </div>
                  </section>

                  <section className="rounded-lg border bg-background p-3">
                    <div className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <LayersIcon className="size-3.5" />
                      上下文与输出上限
                    </div>
                    <div className="space-y-1 text-xs">
                      <Row label="Context" value={formatTokenNumber(model.limit?.context)} />
                      <Row label="Input Max" value={formatTokenNumber(model.limit?.input)} />
                      <Row label="Output Max" value={formatTokenNumber(model.limit?.output)} />
                    </div>
                  </section>

                  <section className="rounded-lg border bg-background p-3">
                    <div className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Code2Icon className="size-3.5" />
                      模型能力
                    </div>
                    <div className="space-y-1 text-xs">
                      <Row label="Family" value={model.family || "-"} />
                      <Row label="Input Modalities" value={model.modalities?.input?.join(", ") || "-"} />
                      <Row label="Output Modalities" value={model.modalities?.output?.join(", ") || "-"} />
                      <Row label="Temperature" value={model.temperature ? "支持" : "不支持"} />
                    </div>
                  </section>

                  <section className="rounded-lg border bg-background p-3">
                    <div className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <DatabaseIcon className="size-3.5" />
                      发布信息
                    </div>
                    <div className="space-y-1 text-xs">
                      <Row label="Knowledge" value={model.knowledge || "-"} />
                      <Row label="Release Date" value={formatDate(model.releaseDate)} />
                      <Row label="Last Updated" value={formatDate(model.lastUpdated)} />
                      <Row label="Structured Output" value={model.structuredOutput ? "支持" : "不支持"} />
                    </div>
                  </section>
                </div>
              </div>
            )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[70%] truncate text-right font-medium">{value}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium">{value}</div>
    </div>
  );
}
