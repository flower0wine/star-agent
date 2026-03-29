/**
 * Agent Settings Component
 *
 * Agent 配置设置面板，集成到设置对话框
 */

"use client";

import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import {
  CheckIcon,
  LockIcon,
  RefreshCwIcon,
  SettingsIcon,
  StarIcon,
  WrenchIcon,
  WorkflowIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
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
  getAgentTools,
  getCoreTools,
  TOOL_CATEGORIES,
  validateEnabledTools,
} from "@/lib/agents/tool-registry";
import type { ToolMeta, ToolCategory } from "@/lib/agents/tool-registry";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

// ============================================================================
// Agent Config Card
// ============================================================================

interface AgentConfigCardProps {
  agentId: string;
  name: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AgentConfigCard({
  name,
  icon,
  isExpanded,
  onToggle,
  children,
}: AgentConfigCardProps) {
  return (
    <div className="rounded-lg border">
      <button
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 p-4 text-left transition-colors",
          "hover:bg-muted/50",
          isExpanded && "border-b"
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">点击展开配置</div>
        </div>
        <SettingsIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      </button>
      {isExpanded && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ============================================================================
// Tool Selector Component
// ============================================================================

interface ToolSelectorProps {
  agentId: string;
  enabledTools: string[];
  onToolsChange: (tools: string[]) => void;
}

function ToolSelector({ agentId, enabledTools, onToolsChange }: ToolSelectorProps) {
  const availableTools = getAgentTools(agentId);
  const coreToolIds = getCoreTools(agentId);

  // Group tools by category
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, ToolMeta[]>);

  const handleToolToggle = (toolId: string, checked: boolean) => {
    let newTools: string[];
    if (checked) {
      newTools = [...enabledTools, toolId];
    } else {
      newTools = enabledTools.filter((id) => id !== toolId);
    }
    // Validate to ensure core tools are always included
    onToolsChange(validateEnabledTools(agentId, newTools));
  };

  if (availableTools.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        此 Agent 暂无可配置的工具
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(toolsByCategory).map(([category, tools]) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center gap-2">
            <WrenchIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {TOOL_CATEGORIES[category as ToolCategory].label}
            </span>
          </div>
          <div className="space-y-2 pl-6">
            {tools.map((tool) => {
              const isCore = coreToolIds.includes(tool.id);
              const isEnabled = enabledTools.includes(tool.id) || isCore;

              return (
                <div
                  key={tool.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={`tool-${agentId}-${tool.id}`}
                    checked={isEnabled}
                    disabled={isCore}
                    onCheckedChange={(checked) =>
                      handleToolToggle(tool.id, checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`tool-${agentId}-${tool.id}`}
                        className={cn(
                          "text-sm font-medium cursor-pointer",
                          isCore && "cursor-not-allowed"
                        )}
                      >
                        {tool.name}
                      </label>
                      {isCore && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <LockIcon className="size-3" />
                          核心
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                  {isEnabled && (
                    <CheckIcon className="size-4 text-primary mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Star Agent Settings
// ============================================================================

function StarAgentSettings() {
  const { config, isLoading, updateStaticConfig, updateDynamicConfig }
    = useAgentConfig<StarAgentStaticConfig>({
      agentId: "star",
      defaultStaticConfig: DEFAULT_STAR_STATIC_CONFIG,
    });

  if (isLoading || !config) {
    return <div className="text-sm text-muted-foreground">加载中...</div>;
  }

  const { staticConfig, dynamicConfig } = config;

  const handleFetchModeChange = async (mode: StarFetchMode) => {
    await updateStaticConfig({ fetchMode: mode });
  };

  const handleIntervalChange = async (minutes: number) => {
    await updateStaticConfig({ fetchIntervalMinutes: minutes });
  };

  const handleBackgroundRefreshChange = async (enabled: boolean) => {
    await updateStaticConfig({ backgroundRefresh: enabled });
  };

  const handleAdditionalPromptChange = async (prompt: string) => {
    await updateDynamicConfig({ additionalSystemPrompt: prompt });
  };

  return (
    <div className="space-y-6">
      {/* 仓库获取设置 */}
      <div className="space-y-4">
        <div className="text-sm font-medium">仓库获取</div>

        {/* 获取模式 */}
        <div className="space-y-2">
          <Label htmlFor="fetch-mode">获取模式</Label>
          <Select
            value={staticConfig.fetchMode}
            onValueChange={(v) => void handleFetchModeChange(v as StarFetchMode)}
          >
            <SelectTrigger id="fetch-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAR_FETCH_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 刷新间隔（仅定时模式） */}
        {staticConfig.fetchMode === "scheduled" && (
          <div className="space-y-2">
            <Label htmlFor="fetch-interval">刷新间隔</Label>
            <Select
              value={String(staticConfig.fetchIntervalMinutes)}
              onValueChange={(v) => void handleIntervalChange(Number(v))}
            >
              <SelectTrigger id="fetch-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAR_FETCH_INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 后台刷新 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="background-refresh">后台刷新</Label>
            <p className="text-xs text-muted-foreground">
              在应用打开时后台自动刷新仓库数据
            </p>
          </div>
          <Switch
            id="background-refresh"
            checked={staticConfig.backgroundRefresh}
            onCheckedChange={(checked) => void handleBackgroundRefreshChange(checked)}
          />
        </div>

        {/* 上次获取时间 */}
        {staticConfig.lastFetchedAt && (
          <div className="text-xs text-muted-foreground">
            上次获取: {dayjs(staticConfig.lastFetchedAt).fromNow()}
          </div>
        )}
      </div>

      <Separator />

      {/* 提示词设置 */}
      <div className="space-y-4">
        <div className="text-sm font-medium">提示词</div>

        <div className="space-y-2">
          <Label htmlFor="additional-prompt">附加系统提示词</Label>
          <Textarea
            id="additional-prompt"
            value={dynamicConfig.additionalSystemPrompt}
            onChange={(e) => void handleAdditionalPromptChange(e.target.value)}
            placeholder="输入额外的系统提示词，将附加到默认提示词之后..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            此提示词将附加到 Agent 默认的系统提示词之后
          </p>
        </div>
      </div>

      <Separator />

      {/* 工具配置 */}
      <div className="space-y-4">
        <div className="text-sm font-medium">工具配置</div>
        <ToolSelector
          agentId="star"
          enabledTools={dynamicConfig.enabledTools}
          onToolsChange={(tools) => void updateDynamicConfig({ enabledTools: tools })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Master Agent Settings
// ============================================================================

function MasterAgentSettings() {
  const { config, isLoading, updateStaticConfig, updateDynamicConfig }
    = useAgentConfig<MasterAgentStaticConfig>({
      agentId: "master",
      defaultStaticConfig: DEFAULT_MASTER_STATIC_CONFIG,
    });

  if (isLoading || !config) {
    return <div className="text-sm text-muted-foreground">加载中...</div>;
  }

  const { staticConfig, dynamicConfig } = config;

  const handleFetchModeChange = async (mode: MasterFetchMode) => {
    await updateStaticConfig({ fetchMode: mode });
  };

  const handleIntervalChange = async (minutes: number) => {
    await updateStaticConfig({ fetchIntervalMinutes: minutes });
  };

  const handleBackgroundRefreshChange = async (enabled: boolean) => {
    await updateStaticConfig({ backgroundRefresh: enabled });
  };

  const handleAdditionalPromptChange = async (prompt: string) => {
    await updateDynamicConfig({ additionalSystemPrompt: prompt });
  };

  return (
    <div className="space-y-6">
      {/* 仓库获取设置 */}
      <div className="space-y-4">
        <div className="text-sm font-medium">仓库获取</div>

        {/* 获取模式 */}
        <div className="space-y-2">
          <Label htmlFor="master-fetch-mode">获取模式</Label>
          <Select
            value={staticConfig.fetchMode}
            onValueChange={(v) => void handleFetchModeChange(v as MasterFetchMode)}
          >
            <SelectTrigger id="master-fetch-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MASTER_FETCH_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div>{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 刷新间隔（仅定时模式） */}
        {staticConfig.fetchMode === "scheduled" && (
          <div className="space-y-2">
            <Label htmlFor="master-fetch-interval">刷新间隔</Label>
            <Select
              value={String(staticConfig.fetchIntervalMinutes)}
              onValueChange={(v) => void handleIntervalChange(Number(v))}
            >
              <SelectTrigger id="master-fetch-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MASTER_FETCH_INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 后台刷新 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="master-background-refresh">后台刷新</Label>
            <p className="text-xs text-muted-foreground">
              在应用打开时后台自动刷新仓库数据
            </p>
          </div>
          <Switch
            id="master-background-refresh"
            checked={staticConfig.backgroundRefresh}
            onCheckedChange={(checked) => void handleBackgroundRefreshChange(checked)}
          />
        </div>

        {/* 上次获取时间 */}
        {staticConfig.lastFetchedAt && (
          <div className="text-xs text-muted-foreground">
            上次获取: {dayjs(staticConfig.lastFetchedAt).fromNow()}
          </div>
        )}
      </div>

      <Separator />

      {/* 提示词设置 */}
      <div className="space-y-4">
        <div className="text-sm font-medium">提示词</div>

        <div className="space-y-2">
          <Label htmlFor="master-additional-prompt">附加系统提示词</Label>
          <Textarea
            id="master-additional-prompt"
            value={dynamicConfig.additionalSystemPrompt}
            onChange={(e) => void handleAdditionalPromptChange(e.target.value)}
            placeholder="输入额外的系统提示词..."
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            此提示词将附加到 Master Agent 默认的系统提示词之后
          </p>
        </div>
      </div>

      <Separator />

      {/* 工具配置 */}
      <div className="space-y-4">
        <div className="text-sm font-medium">工具配置</div>
        <ToolSelector
          agentId="master"
          enabledTools={dynamicConfig.enabledTools}
          onToolsChange={(tools) => void updateDynamicConfig({ enabledTools: tools })}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Agent Settings Component
// ============================================================================

export function AgentSettings() {
  const [expandedAgent, setExpandedAgent] = useState<string | null>("star");

  const toggleAgent = (agentId: string) => {
    setExpandedAgent(expandedAgent === agentId ? null : agentId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Agent 配置</h3>
        <p className="text-sm text-muted-foreground">
          自定义各个 Agent 的行为和设置
        </p>
      </div>
      <Separator />

      <div className="space-y-3">
        {/* Star Agent */}
        <AgentConfigCard
          agentId="star"
          name="Star Agent"
          icon={<StarIcon className="size-5" />}
          isExpanded={expandedAgent === "star"}
          onToggle={() => toggleAgent("star")}
        >
          <StarAgentSettings />
        </AgentConfigCard>

        {/* Master Agent */}
        <AgentConfigCard
          agentId="master"
          name="Master Agent"
          icon={<WorkflowIcon className="size-5" />}
          isExpanded={expandedAgent === "master"}
          onToggle={() => toggleAgent("master")}
        >
          <MasterAgentSettings />
        </AgentConfigCard>
      </div>
    </div>
  );
}
