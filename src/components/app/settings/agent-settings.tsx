"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { RefreshCwIcon, StarIcon, WorkflowIcon, FileSearchIcon } from "lucide-react";

import { useAgentConfig } from "@/hooks/use-agent-config";
import {
  DEFAULT_STAR_STATIC_CONFIG,
  FETCH_INTERVAL_OPTIONS as STAR_FETCH_INTERVAL_OPTIONS,
  FETCH_MODE_OPTIONS as STAR_FETCH_MODE_OPTIONS,
} from "@/agents/star/static-config";
import type { StarAgentStaticConfig, StarFetchMode } from "@/agents/star/static-config";
import {
  DEFAULT_MASTER_STATIC_CONFIG,
  FETCH_INTERVAL_OPTIONS as MASTER_FETCH_INTERVAL_OPTIONS,
  FETCH_MODE_OPTIONS as MASTER_FETCH_MODE_OPTIONS,
} from "@/agents/master/static-config";
import type { MasterAgentStaticConfig, MasterFetchMode } from "@/agents/master/static-config";
import {
  DEFAULT_PATENT_STATIC_CONFIG,
  PATENT_LOOKBACK_OPTIONS,
  PATENT_MAX_RESULTS_OPTIONS,
  PATENT_PROVIDER_OPTIONS,
  PATENT_SORT_OPTIONS,
} from "@/agents/patent/static-config";
import type {
  PatentAgentCustomParams,
  PatentAgentStaticConfig,
  PatentApiProvider,
  PatentSortBy,
} from "@/agents/patent/static-config";
import type { SubAgentProfile } from "@/lib/agents/sub-agent/types";
import { parseSubAgentProfiles } from "@/lib/agents/sub-agent/profile-schema";
import { SettingsSectionShell } from "./settings-section-shell";
import { AgentSettingsSidebar } from "./agent-settings/agent-settings-sidebar";
import type { AgentPanelType, AgentSidebarItem } from "./agent-settings/agent-settings-sidebar";
import { AgentToolCenter } from "./agent-settings/agent-tool-center";
import { SubAgentProfileCenter } from "./agent-settings/subagent-profile-center";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

type AgentId = "star" | "master" | "patent";
const DEFAULT_SUBAGENT_STATIC_CONFIG: Record<string, unknown> = {};

const AGENTS: AgentSidebarItem[] = [
  {
    id: "star",
    name: "Star Agent",
    description: "仓库检索与分析",
    icon: <StarIcon className="size-4" />,
  },
  {
    id: "master",
    name: "Master Agent",
    description: "任务编排与子 Agent",
    icon: <WorkflowIcon className="size-4" />,
  },
  {
    id: "patent",
    name: "Patent Agent",
    description: "专利检索与趋势分析",
    icon: <FileSearchIcon className="size-4" />,
  },
];

interface RepositorySyncCardProps {
  idPrefix: string;
  title: string;
  description: string;
  fetchMode: string;
  fetchModeOptions: Array<{ value: string; label: string; description: string }>;
  fetchIntervalMinutes: number;
  fetchIntervalOptions: Array<{ value: number; label: string }>;
  backgroundRefresh: boolean;
  lastFetchedAt: number | null;
  onFetchModeChange: (mode: string) => void;
  onFetchIntervalChange: (minutes: number) => void;
  onBackgroundRefreshChange: (enabled: boolean) => void;
}

function RepositorySyncCard({
  idPrefix,
  title,
  description,
  fetchMode,
  fetchModeOptions,
  fetchIntervalMinutes,
  fetchIntervalOptions,
  backgroundRefresh,
  lastFetchedAt,
  onFetchModeChange,
  onFetchIntervalChange,
  onBackgroundRefreshChange,
}: RepositorySyncCardProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCwIcon className="size-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-fetch-mode`}>获取模式</Label>
          <Select value={fetchMode} onValueChange={onFetchModeChange}>
            <SelectTrigger id={`${idPrefix}-fetch-mode`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fetchModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="space-y-0.5">
                    <div>{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {fetchMode === "scheduled" && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-fetch-interval`}>刷新间隔</Label>
            <Select
              value={String(fetchIntervalMinutes)}
              onValueChange={(value) => onFetchIntervalChange(Number(value))}
            >
              <SelectTrigger id={`${idPrefix}-fetch-interval`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fetchIntervalOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border bg-muted/25 p-3">
          <div className="space-y-0.5">
            <Label htmlFor={`${idPrefix}-background-refresh`}>后台刷新</Label>
            <p className="text-xs text-muted-foreground">应用打开时自动更新仓库缓存</p>
          </div>
          <Switch
            id={`${idPrefix}-background-refresh`}
            checked={backgroundRefresh}
            onCheckedChange={onBackgroundRefreshChange}
          />
        </div>

        {lastFetchedAt && (
          <div className="text-xs text-muted-foreground">
            上次获取: {dayjs(lastFetchedAt).fromNow()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PromptCardProps {
  id: string;
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

function PromptCard({ id, title, description, value, onChange }: PromptCardProps) {
  return (
    <Card className="border-border/70">
      <CardHeader className="px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        <Label htmlFor={id}>附加系统提示词</Label>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="输入额外的系统提示词..."
          rows={8}
          className="resize-none"
        />
      </CardContent>
    </Card>
  );
}

interface PatentApiConfigCardProps {
  staticConfig: PatentAgentStaticConfig;
  customParams: Record<string, unknown>;
  onStaticConfigChange: (updates: Partial<PatentAgentStaticConfig>) => Promise<void>;
  onCustomParamChange: (key: keyof PatentAgentCustomParams, value: string) => Promise<void>;
}

function PatentApiConfigCard({
  staticConfig,
  customParams,
  onStaticConfigChange,
  onCustomParamChange,
}: PatentApiConfigCardProps) {
  const typedCustom = customParams as PatentAgentCustomParams;

  return (
    <Card className="border-border/70">
      <CardHeader className="px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSearchIcon className="size-4" />
          专利 API 配置
        </CardTitle>
        <CardDescription>
          配置开放专利数据源与鉴权参数。当前优先支持 PatentsView。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="space-y-2">
          <Label htmlFor="patent-provider">数据源</Label>
          <Select
            value={staticConfig.provider}
            onValueChange={(value) => void onStaticConfigChange({ provider: value as PatentApiProvider })}
          >
            <SelectTrigger id="patent-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATENT_PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="space-y-0.5">
                    <div>{option.label}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="patent-lookback">默认时间窗口</Label>
            <Select
              value={String(staticConfig.defaultLookbackMonths)}
              onValueChange={(value) =>
                void onStaticConfigChange({ defaultLookbackMonths: Number(value) })}
            >
              <SelectTrigger id="patent-lookback">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATENT_LOOKBACK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patent-max-results">默认返回条数</Label>
            <Select
              value={String(staticConfig.maxResultsPerRequest)}
              onValueChange={(value) =>
                void onStaticConfigChange({ maxResultsPerRequest: Number(value) })}
            >
              <SelectTrigger id="patent-max-results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATENT_MAX_RESULTS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patent-sort">默认排序</Label>
            <Select
              value={staticConfig.defaultSortBy}
              onValueChange={(value) => void onStaticConfigChange({ defaultSortBy: value as PatentSortBy })}
            >
              <SelectTrigger id="patent-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PATENT_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="patent-timeout">请求超时 (ms)</Label>
            <Input
              id="patent-timeout"
              type="number"
              value={String(staticConfig.requestTimeoutMs)}
              min={1000}
              step={500}
              onChange={(event) =>
                void onStaticConfigChange({ requestTimeoutMs: Number(event.target.value) || 15000 })}
            />
          </div>
        </div>

        {staticConfig.provider === "patentsview" && (
          <div className="space-y-3 rounded-xl border bg-muted/25 p-3">
            <Badge variant="outline">PatentsView</Badge>
            <div className="space-y-2">
              <Label htmlFor="patentsview-api-key">X-Api-Key</Label>
              <Input
                id="patentsview-api-key"
                type="password"
                value={typedCustom.patentsViewApiKey || ""}
                onChange={(event) => void onCustomParamChange("patentsViewApiKey", event.target.value)}
                placeholder="输入 PatentsView API Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patentsview-base-url">Base URL</Label>
              <Input
                id="patentsview-base-url"
                value={typedCustom.patentsViewBaseUrl || "https://search.patentsview.org/api/v1"}
                onChange={(event) => void onCustomParamChange("patentsViewBaseUrl", event.target.value)}
              />
            </div>
          </div>
        )}

        {staticConfig.provider === "epo-ops" && (
          <div className="space-y-3 rounded-xl border bg-muted/25 p-3">
            <Badge variant="outline">EPO OPS</Badge>
            <div className="space-y-2">
              <Label htmlFor="epo-key">Consumer Key</Label>
              <Input
                id="epo-key"
                value={typedCustom.epoConsumerKey || ""}
                onChange={(event) => void onCustomParamChange("epoConsumerKey", event.target.value)}
                placeholder="输入 EPO Consumer Key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epo-secret">Consumer Secret</Label>
              <Input
                id="epo-secret"
                type="password"
                value={typedCustom.epoConsumerSecret || ""}
                onChange={(event) => void onCustomParamChange("epoConsumerSecret", event.target.value)}
                placeholder="输入 EPO Consumer Secret"
              />
            </div>
          </div>
        )}

        {staticConfig.provider === "uspto-assignment" && (
          <div className="space-y-3 rounded-xl border bg-muted/25 p-3">
            <Badge variant="outline">USPTO</Badge>
            <div className="space-y-2">
              <Label htmlFor="uspto-key">API Key (可选)</Label>
              <Input
                id="uspto-key"
                value={typedCustom.usptoApiKey || ""}
                onChange={(event) => void onCustomParamChange("usptoApiKey", event.target.value)}
                placeholder="如服务要求可填写"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function readToolSelectionConfigured(customParams: Record<string, unknown>): boolean {
  return customParams.toolSelectionConfigured === true;
}

function readSubAgentProfiles(customParams: Record<string, unknown>): {
  profiles: SubAgentProfile[];
  parseError?: string;
} {
  const rawProfiles = customParams.subAgentProfiles;

  try {
    return {
      profiles: parseSubAgentProfiles(rawProfiles),
    };
  } catch (error) {
    if (!Array.isArray(rawProfiles)) {
      return {
        profiles: [],
        parseError: error instanceof Error ? error.message : String(error),
      };
    }

    // Fallback to keep valid entries visible instead of dropping the whole panel.
    const validProfiles: SubAgentProfile[] = [];
    for (const item of rawProfiles) {
      try {
        const parsed = parseSubAgentProfiles([item]);
        if (parsed[0]) {
          validProfiles.push(parsed[0]);
        }
      } catch {
        // Ignore invalid item and continue collecting valid ones.
      }
    }

    return {
      profiles: validProfiles,
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

export function AgentSettings() {
  const [activeAgentId, setActiveAgentId] = useState<AgentId>("star");
  const [activePanel, setActivePanel] = useState<AgentPanelType>("agents");

  const starConfigState = useAgentConfig<StarAgentStaticConfig>({
    agentId: "star",
    defaultStaticConfig: DEFAULT_STAR_STATIC_CONFIG,
  });
  const masterConfigState = useAgentConfig<MasterAgentStaticConfig>({
    agentId: "master",
    defaultStaticConfig: DEFAULT_MASTER_STATIC_CONFIG,
  });
  const patentConfigState = useAgentConfig<PatentAgentStaticConfig>({
    agentId: "patent",
    defaultStaticConfig: DEFAULT_PATENT_STATIC_CONFIG,
  });
  const subAgentConfigState = useAgentConfig<Record<string, unknown>>({
    agentId: "subagent",
    defaultStaticConfig: DEFAULT_SUBAGENT_STATIC_CONFIG,
  });

  const activeState = activeAgentId === "star"
    ? starConfigState
    : (activeAgentId === "master" ? masterConfigState : patentConfigState);

  const activeAgent = useMemo(
    () => AGENTS.find((agent) => agent.id === activeAgentId) || AGENTS[0],
    [activeAgentId]
  );
  const subAgentProfileResult = readSubAgentProfiles(
    subAgentConfigState.config?.dynamicConfig.customParams || {}
  );
  const subAgentProfiles = subAgentProfileResult.profiles;
  const subAgentProfilesParseError = subAgentProfileResult.parseError;
  const subAgentCounts = useMemo(
    () =>
      AGENTS.reduce<Record<string, number>>((acc, agent) => {
        acc[agent.id] = subAgentProfiles.filter(profile => profile.parentAgentIds.includes(agent.id)).length;
        return acc;
      }, {}),
    [subAgentProfiles]
  );

  if (
    starConfigState.isLoading
    || masterConfigState.isLoading
    || patentConfigState.isLoading
    || subAgentConfigState.isLoading
    || !activeState.config
    || !subAgentConfigState.config
  ) {
    return (
      <SettingsSectionShell
        title="Agent"
        description="配置 Agent 行为与工具。"
        className="flex h-full min-h-0 flex-col"
      >
        <div className="text-sm text-muted-foreground">加载中...</div>
      </SettingsSectionShell>
    );
  }

  const { dynamicConfig, staticConfig } = activeState.config;
  const hasToolSelectionConfigured = readToolSelectionConfigured(dynamicConfig.customParams);
  const activeSubAgentProfiles = subAgentProfiles.filter(profile => profile.parentAgentIds.includes(activeAgentId));

  const handleToolChange = async (tools: string[]) => {
    await activeState.updateDynamicConfig({
      enabledTools: tools,
      customParams: {
        ...dynamicConfig.customParams,
        toolSelectionConfigured: true,
      },
    });
  };

  const handleFetchModeChange = (mode: string) => {
    if (activeAgentId === "star") {
      void starConfigState.updateStaticConfig({ fetchMode: mode as StarFetchMode });
      return;
    }
    void masterConfigState.updateStaticConfig({ fetchMode: mode as MasterFetchMode });
  };

  const handleFetchIntervalChange = (minutes: number) => {
    if (activeAgentId === "star") {
      void starConfigState.updateStaticConfig({ fetchIntervalMinutes: minutes });
      return;
    }
    void masterConfigState.updateStaticConfig({ fetchIntervalMinutes: minutes });
  };

  const handleBackgroundRefreshChange = (enabled: boolean) => {
    if (activeAgentId === "star") {
      void starConfigState.updateStaticConfig({ backgroundRefresh: enabled });
      return;
    }
    void masterConfigState.updateStaticConfig({ backgroundRefresh: enabled });
  };

  const handlePatentCustomParamChange = async (
    key: keyof PatentAgentCustomParams,
    value: string
  ) => {
    const currentParams = patentConfigState.config?.dynamicConfig.customParams || {};
    await patentConfigState.updateDynamicConfig({
      customParams: {
        ...currentParams,
        [key]: value,
      },
    });
  };

  const handleSubAgentProfilesChange = async (profiles: SubAgentProfile[]) => {
    const currentCustomParams = subAgentConfigState.config?.dynamicConfig.customParams || {};
    const allProfiles = readSubAgentProfiles(currentCustomParams).profiles;
    const untouchedProfiles = allProfiles.filter(profile => !profile.parentAgentIds.includes(activeAgentId));
    await subAgentConfigState.updateDynamicConfig({
      customParams: {
        ...currentCustomParams,
        subAgentProfiles: [...untouchedProfiles, ...profiles],
      },
    });
  };

  return (
    <SettingsSectionShell
      title="Agent"
      description="使用侧栏在不同 Agent 间快速切换与配置。"
      className="flex h-full min-h-0 flex-col"
    >
      <div className="min-h-0 flex-1 rounded-2xl bg-card/40">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
          <AgentSettingsSidebar
            items={AGENTS}
            activeAgentId={activeAgentId}
            activePanel={activePanel}
            subAgentCounts={subAgentCounts}
            onSelect={(panel, id) => {
              setActivePanel(panel);
              setActiveAgentId(id as AgentId);
            }}
          />

          <div className="h-full min-h-0 space-y-5 overflow-y-auto pr-1">
            <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border bg-background/70">
                  {activeAgent.icon}
                </span>
                <div className="min-w-0">
                  <h4 className="truncate font-medium">
                    {activePanel === "agents" ? "Agent 配置" : "SubAgent 配置"} · {activeAgent.name}
                  </h4>
                  <p className="truncate text-xs text-muted-foreground">
                    {activePanel === "agents"
                      ? activeAgent.description
                      : `当前 Agent 下共 ${subAgentCounts[activeAgentId] || 0} 个 SubAgent Profiles`}
                  </p>
                </div>
              </div>
            </div>

            {activePanel === "agents" && (activeAgentId === "patent"
              ? (
                  <div className="grid gap-5 xl:grid-cols-2">
                    <PatentApiConfigCard
                      staticConfig={staticConfig as PatentAgentStaticConfig}
                      customParams={dynamicConfig.customParams}
                      onStaticConfigChange={async (updates) =>
                        patentConfigState.updateStaticConfig(updates)}
                      onCustomParamChange={handlePatentCustomParamChange}
                    />

                    <PromptCard
                      id={`${activeAgentId}-additional-prompt`}
                      title="提示词增强"
                      description="附加到默认系统提示词末尾，用于微调 Agent 行为。"
                      value={dynamicConfig.additionalSystemPrompt}
                      onChange={(value) =>
                        void activeState.updateDynamicConfig({ additionalSystemPrompt: value })}
                    />
                  </div>
                )
              : (
                  <div className="grid gap-5 xl:grid-cols-2">
                    <RepositorySyncCard
                      idPrefix={activeAgentId}
                      title="仓库同步策略"
                      description="控制仓库数据获取时机与后台刷新行为。"
                      fetchMode={(staticConfig as StarAgentStaticConfig | MasterAgentStaticConfig).fetchMode}
                      fetchModeOptions={
                        activeAgentId === "star" ? STAR_FETCH_MODE_OPTIONS : MASTER_FETCH_MODE_OPTIONS
                      }
                      fetchIntervalMinutes={(staticConfig as StarAgentStaticConfig | MasterAgentStaticConfig).fetchIntervalMinutes}
                      fetchIntervalOptions={
                        activeAgentId === "star"
                          ? STAR_FETCH_INTERVAL_OPTIONS
                          : MASTER_FETCH_INTERVAL_OPTIONS
                      }
                      backgroundRefresh={(staticConfig as StarAgentStaticConfig | MasterAgentStaticConfig).backgroundRefresh}
                      lastFetchedAt={(staticConfig as StarAgentStaticConfig | MasterAgentStaticConfig).lastFetchedAt}
                      onFetchModeChange={handleFetchModeChange}
                      onFetchIntervalChange={handleFetchIntervalChange}
                      onBackgroundRefreshChange={handleBackgroundRefreshChange}
                    />

                    <PromptCard
                      id={`${activeAgentId}-additional-prompt`}
                      title="提示词增强"
                      description="附加到默认系统提示词末尾，用于微调 Agent 行为。"
                      value={dynamicConfig.additionalSystemPrompt}
                      onChange={(value) =>
                        void activeState.updateDynamicConfig({ additionalSystemPrompt: value })}
                    />
                  </div>
                ))}

            {activePanel === "agents" && (
              <AgentToolCenter
                agentId={activeAgentId}
                enabledTools={dynamicConfig.enabledTools}
                hasExplicitSelection={hasToolSelectionConfigured}
                onChange={(tools) => void handleToolChange(tools)}
              />
            )}

            {activePanel === "subagents" && (
              <>
                {subAgentProfilesParseError && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    检测到部分 SubAgent 配置格式无效，已仅展示可解析配置。请保存一次以覆盖旧格式数据。
                  </div>
                )}
                {activeSubAgentProfiles.length === 0 && (
                  <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                    当前 Agent 下暂无 SubAgent Profile，可点击右侧区域中的“新建 Profile”开始配置。
                  </div>
                )}
                <SubAgentProfileCenter
                  defaultParentAgentId={activeAgentId}
                  profiles={activeSubAgentProfiles}
                  onChange={handleSubAgentProfilesChange}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </SettingsSectionShell>
  );
}


