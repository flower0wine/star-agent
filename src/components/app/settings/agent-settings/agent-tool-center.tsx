import { CheckIcon, LayersIcon, LockIcon, RotateCcwIcon, WrenchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getAgentTools,
  getCoreTools,
  getDefaultEnabledTools,
  normalizeEnabledTools,
  TOOL_CATEGORIES,
} from "@/lib/agents/tool-registry";
import type { ToolCategory, ToolMeta } from "@/lib/agents/tool-registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface AgentToolCenterProps {
  agentId: string;
  enabledTools: string[];
  hasExplicitSelection: boolean;
  onChange: (enabledTools: string[]) => void;
}

function groupToolsByCategory(tools: ToolMeta[]): Record<ToolCategory, ToolMeta[]> {
  return tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<ToolCategory, ToolMeta[]>);
}

export function AgentToolCenter({
  agentId,
  enabledTools,
  hasExplicitSelection,
  onChange,
}: AgentToolCenterProps) {
  const availableTools = getAgentTools(agentId);
  const coreToolIds = new Set(getCoreTools(agentId));
  const defaultTools = getDefaultEnabledTools(agentId);
  const effectiveEnabledTools = hasExplicitSelection ? enabledTools : defaultTools;
  const enabledToolSet = new Set(effectiveEnabledTools);

  const toolsByCategory = groupToolsByCategory(availableTools);
  const orderedCategories = Object.keys(toolsByCategory) as ToolCategory[];

  const updateTools = (nextTools: string[]) => {
    onChange(normalizeEnabledTools(agentId, nextTools));
  };

  const handleToolToggle = (toolId: string, checked: boolean) => {
    if (checked) {
      updateTools([...enabledToolSet, toolId]);
      return;
    }
    updateTools(effectiveEnabledTools.filter((id) => id !== toolId));
  };

  const handleEnableAll = () => {
    updateTools(availableTools.map((tool) => tool.id));
  };

  const handleDisableAll = () => {
    updateTools([]);
  };

  const handleResetToDefault = () => {
    updateTools(defaultTools);
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <WrenchIcon className="size-4" />
              工具中心
            </CardTitle>
            <CardDescription>
              统一管理当前 Agent 可用工具。核心仅做标记，可自由关闭。
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-7 rounded-full px-3">
              已启用 {enabledToolSet.size}/{availableTools.length}
            </Badge>
            <Button type="button" size="sm" variant="outline" onClick={handleEnableAll}>
              <CheckIcon className="size-3.5" />
              全选
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleDisableAll}>
              <XIcon className="size-3.5" />
              清空
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleResetToDefault}>
              <RotateCcwIcon className="size-3.5" />
              默认推荐
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-4 pb-4 sm:px-5 sm:pb-5">
        {availableTools.length === 0 && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            当前 Agent 暂无可配置工具
          </div>
        )}

        {orderedCategories.map((category) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <LayersIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{TOOL_CATEGORIES[category].label}</span>
              <span className="text-xs text-muted-foreground">{TOOL_CATEGORIES[category].description}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {toolsByCategory[category].map((tool) => {
                const isEnabled = enabledToolSet.has(tool.id);
                const isCore = coreToolIds.has(tool.id);

                return (
                  <label
                    key={tool.id}
                    htmlFor={`tool-${agentId}-${tool.id}`}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                      isEnabled
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/80 bg-background hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      id={`tool-${agentId}-${tool.id}`}
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToolToggle(tool.id, checked as boolean)}
                      className="mt-0.5"
                    />

                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{tool.name}</span>
                        {isCore && (
                          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
                            <LockIcon className="mr-1 size-3" />
                            核心
                          </Badge>
                        )}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {tool.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
