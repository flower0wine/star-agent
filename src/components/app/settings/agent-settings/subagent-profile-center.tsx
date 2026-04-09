import { CopyIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AgentToolConfig } from "@/lib/agents/base/types";
import type { SubAgentProfile } from "@/lib/agents/sub-agent/types";
import { PREDEFINED_RUNTIME_VARIABLES } from "@/lib/agents/sub-agent/runtime-variables";
import { DEFAULT_SUBAGENT_ENABLED_TOOL_IDS } from "@/lib/agents/sub-agent/tool-config";
import { resolveCreateSubAgentParameterConfig } from "@/lib/agents/sub-agent/dynamic-schema";
import type { TemplateVariableOption } from "@/components/ai-elements/editors/template-editor";
import { getSubAgentCompatibleTools } from "@/lib/agents/tool-registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToolConfigCenter } from "./tool-config-center";
import { TemplateVariableTextarea } from "./template-variable-textarea";

interface SubAgentProfileCenterProps {
  profile: SubAgentProfile | null;
  onChange: (profile: SubAgentProfile) => Promise<void> | void;
  onDuplicate: (profileId: string) => Promise<void> | void;
  onDelete: (profileId: string) => Promise<void> | void;
}

function createUniqueProfileId(base: string, existingIds: string[]): string {
  const existing = new Set(existingIds);
  if (!existing.has(base)) {
    return base;
  }

  let index = 2;
  while (existing.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

export function createNewSubAgentProfile(existingProfiles: SubAgentProfile[]): SubAgentProfile {
  const nextIndex = existingProfiles.length + 1;
  const id = createUniqueProfileId(`profile-${nextIndex}`, existingProfiles.map(item => item.id));
  return {
    id,
    name: `SubAgent ${nextIndex}`,
    enabled: true,
    toolConfigs: {},
    systemPromptTemplate: [
      "你是一个由用户配置的子 Agent。",
      "当前任务: {{task}}",
      "用户: {{username}}",
      "仓库数量: {{repos_count}}",
      "仓库上下文:",
      "{{repos_context}}",
    ].join("\n"),
    limits: {
      timeoutMs: 120000,
    },
    version: 1,
  };
}

export function SubAgentProfileCenter({
  profile,
  onChange,
  onDuplicate,
  onDelete,
}: SubAgentProfileCenterProps) {
  const tools = useMemo(() => getSubAgentCompatibleTools(), []);
  const defaultEnabledToolIdSet = useMemo(
    () => new Set<string>(DEFAULT_SUBAGENT_ENABLED_TOOL_IDS),
    []
  );
  const coreToolIds = useMemo(
    () => tools
      .filter(tool => tool.isCore && defaultEnabledToolIdSet.has(tool.id))
      .map(tool => tool.id),
    [defaultEnabledToolIdSet, tools]
  );
  const builtInVariables = useMemo(() => PREDEFINED_RUNTIME_VARIABLES, []);
  const [draftProfile, setDraftProfile] = useState<SubAgentProfile | null>(profile);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftProfile(profile);
    setIsDirty(false);
  }, [profile]);

  const updateDraftProfile = (updater: (current: SubAgentProfile) => SubAgentProfile) => {
    setDraftProfile((current) => {
      if (!current) {
        return current;
      }
      return updater(current);
    });
    setIsDirty(true);
  };

  const handleReset = () => {
    setDraftProfile(profile);
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!draftProfile || !isDirty || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onChange(draftProfile);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const variableOptions = useMemo<TemplateVariableOption[]>(() => {
    const mergedVariables = new Map<string, TemplateVariableOption>(
      builtInVariables.map(item => [
        item.name,
        {
          name: item.name,
          type: item.type,
          description: item.description,
        },
      ])
    );

    if (draftProfile) {
      try {
        const dynamicConfig = resolveCreateSubAgentParameterConfig(
          draftProfile.toolConfigs.createSubAgent?.dynamicParameters
        );
        for (const parameter of dynamicConfig.parameters) {
          if (mergedVariables.has(parameter.key)) {
            continue;
          }
          mergedVariables.set(parameter.key, {
            name: parameter.key,
            type: parameter.type,
            description: parameter.description || "来自 createSubAgent 动态参数",
          });
        }
      } catch {
        // Ignore invalid dynamic parameter config in hint generation.
      }
    }

    return [...mergedVariables.values()];
  }, [builtInVariables, draftProfile]);

  if (!draftProfile) {
    return (
      <Card className="border-border/70">
        <CardHeader className="px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
          <CardTitle>SubAgent Profiles</CardTitle>
          <CardDescription>从左侧选择一个 Profile，或在左侧底部新建 Profile。</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleToolConfigChange = (toolId: string, config: AgentToolConfig) => {
    updateDraftProfile((current) => ({
      ...current,
      toolConfigs: {
        ...current.toolConfigs,
        [toolId]: {
          ...current.toolConfigs[toolId],
          ...config,
        },
      },
      version: current.version + 1,
    }));
  };

  const handleToolConfigsChange = (nextToolConfigs: Record<string, AgentToolConfig>) => {
    updateDraftProfile((current) => ({
      ...current,
      toolConfigs: nextToolConfigs,
      version: current.version + 1,
    }));
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>SubAgent Profile Editor</CardTitle>
            <CardDescription>编辑当前选中的 SubAgent（tools / prompt / vars）。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onDuplicate(draftProfile.id)}
            >
              <CopyIcon className="size-3.5" />
              复制
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void onDelete(draftProfile.id)}
            >
              <TrashIcon className="size-3.5" />
              删除
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">v{draftProfile.version}</Badge>
            <Badge variant={draftProfile.enabled ? "default" : "secondary"}>
              {draftProfile.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Profile ID</Label>
              <Input
                value={draftProfile.id}
                onChange={(event) =>
                  updateDraftProfile(current => ({ ...current, id: event.target.value.trim() || current.id }))}
              />
            </div>
            <div className="space-y-2">
              <Label>名称</Label>
              <Input
                value={draftProfile.name}
                onChange={(event) =>
                  updateDraftProfile(current => ({ ...current, name: event.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
            <Label htmlFor={`profile-enabled-${draftProfile.id}`}>启用</Label>
            <Switch
              id={`profile-enabled-${draftProfile.id}`}
              checked={draftProfile.enabled}
              onCheckedChange={checked =>
                updateDraftProfile(current => ({
                  ...current,
                  enabled: checked,
                  version: current.version + 1,
                }))}
            />
          </div>

          <ToolConfigCenter
            panelId={`subagent-${draftProfile.id}`}
            title="工具中心"
            description="统一管理当前 SubAgent 可用工具与默认参数配置。默认推荐可一键恢复。"
            availableTools={tools}
            defaultEnabledToolIds={[...DEFAULT_SUBAGENT_ENABLED_TOOL_IDS]}
            coreToolIds={coreToolIds}
            toolConfigs={draftProfile.toolConfigs}
            onToolConfigChange={handleToolConfigChange}
            onToolConfigsChange={handleToolConfigsChange}
          />

          <div className="space-y-2">
            <Label>System Prompt Template</Label>
            <TemplateVariableTextarea
              rows={6}
              value={draftProfile.systemPromptTemplate}
              variables={variableOptions}
              onChange={(nextValue) =>
                updateDraftProfile(current => ({
                  ...current,
                  systemPromptTemplate: nextValue,
                  version: current.version + 1,
                }))}
            />
            <p className="text-xs text-muted-foreground">
              可直接使用变量占位 <code>{"{{变量名}}"}</code>。createSubAgent 的任务与动态参数会在运行时自动注入。
            </p>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/10 p-3">
            <Label>运行时变量建议</Label>
            <p className="text-xs text-muted-foreground">
              SubAgent 提示词直接使用运行时变量，不再维护变量 Schema。可用建议来自预定义运行时变量与 createSubAgent 动态参数：
              {" "}
              {variableOptions.map(item => `${item.name} (${item.type || "string"})`).join(", ")}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-1">
            <div className="space-y-2 max-w-sm">
              <Label>timeoutMs</Label>
              <Input
                type="number"
                min={1000}
                value={String(draftProfile.limits.timeoutMs)}
                onChange={(event) =>
                  updateDraftProfile(current => ({
                    ...current,
                    limits: {
                      ...current.limits,
                      timeoutMs: Number(event.target.value) || 120000,
                    },
                    version: current.version + 1,
                  }))}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-card/95 px-4 pt-3 pb-1 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:-mx-5 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {isDirty ? "有未保存更改" : "当前配置已保存"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!isDirty || isSaving}
                onClick={handleReset}
              >
                重置
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!isDirty || isSaving}
                onClick={() => void handleSave()}
              >
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

