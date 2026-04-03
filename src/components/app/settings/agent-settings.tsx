"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { RefreshCwIcon, StarIcon, WorkflowIcon } from "lucide-react";

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
import { SettingsSectionShell } from "./settings-section-shell";
import { AgentSettingsSidebar } from "./agent-settings/agent-settings-sidebar";
import type { AgentSidebarItem } from "./agent-settings/agent-settings-sidebar";
import { AgentToolCenter } from "./agent-settings/agent-tool-center";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type AgentId = "star" | "master";

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
      <CardContent className="space-y-2 px-4 pb-4 sm:px-5 sm:pb-5">
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

function readToolSelectionConfigured(customParams: Record<string, unknown>): boolean {
  return customParams.toolSelectionConfigured === true;
}

export function AgentSettings() {
  const [activeAgentId, setActiveAgentId] = useState<AgentId>("star");

  const starConfigState = useAgentConfig<StarAgentStaticConfig>({
    agentId: "star",
    defaultStaticConfig: DEFAULT_STAR_STATIC_CONFIG,
  });
  const masterConfigState = useAgentConfig<MasterAgentStaticConfig>({
    agentId: "master",
    defaultStaticConfig: DEFAULT_MASTER_STATIC_CONFIG,
  });

  const activeState = activeAgentId === "star" ? starConfigState : masterConfigState;
  const activeAgent = useMemo(
    () => AGENTS.find((agent) => agent.id === activeAgentId) || AGENTS[0],
    [activeAgentId]
  );

  if (starConfigState.isLoading || masterConfigState.isLoading || !activeState.config) {
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
            onSelect={(id) => setActiveAgentId(id as AgentId)}
          />

          <div className="h-full min-h-0 space-y-4 overflow-y-auto pr-1 lg:space-y-5">
            <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border bg-background/70">
                  {activeAgent.icon}
                </span>
                <div className="min-w-0">
                  <h4 className="truncate font-medium">{activeAgent.name}</h4>
                  <p className="truncate text-xs text-muted-foreground">{activeAgent.description}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <RepositorySyncCard
                idPrefix={activeAgentId}
                title="仓库同步策略"
                description="控制仓库数据获取时机与后台刷新行为。"
                fetchMode={staticConfig.fetchMode}
                fetchModeOptions={
                  activeAgentId === "star" ? STAR_FETCH_MODE_OPTIONS : MASTER_FETCH_MODE_OPTIONS
                }
                fetchIntervalMinutes={staticConfig.fetchIntervalMinutes}
                fetchIntervalOptions={
                  activeAgentId === "star"
                    ? STAR_FETCH_INTERVAL_OPTIONS
                    : MASTER_FETCH_INTERVAL_OPTIONS
                }
                backgroundRefresh={staticConfig.backgroundRefresh}
                lastFetchedAt={staticConfig.lastFetchedAt}
                onFetchModeChange={handleFetchModeChange}
                onFetchIntervalChange={handleFetchIntervalChange}
                onBackgroundRefreshChange={handleBackgroundRefreshChange}
              />

              <PromptCard
                id={`${activeAgentId}-additional-prompt`}
                title="提示词增强"
                description="附加到默认系统提示词末尾，用于微调 Agent 行为。"
                value={dynamicConfig.additionalSystemPrompt}
                onChange={(value) => void activeState.updateDynamicConfig({ additionalSystemPrompt: value })}
              />
            </div>

            <AgentToolCenter
              agentId={activeAgentId}
              enabledTools={dynamicConfig.enabledTools}
              hasExplicitSelection={hasToolSelectionConfigured}
              onChange={(tools) => void handleToolChange(tools)}
            />
          </div>
        </div>
      </div>
    </SettingsSectionShell>
  );
}
