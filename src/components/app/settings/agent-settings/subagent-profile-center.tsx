import { CopyIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  SubAgentProfile,
  SubAgentVarDef,
  TemplateVariableType,
} from "@/lib/agents/sub-agent/types";
import { PREDEFINED_RUNTIME_VARIABLES } from "@/lib/agents/sub-agent/runtime-variables";
import type { TemplateVariableOption } from "@/components/ai-elements/editors/template-editor";
import { getSubAgentCompatibleTools } from "@/lib/agents/tool-registry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
    toolIds: ["searchRepositories", "getRepositoryReadme"],
    systemPromptTemplate: [
      "你是一个由用户配置的子 Agent。",
      "当前任务: {{task}}",
      "用户: {{username}}",
      "仓库数量: {{repos_count}}",
      "仓库上下文:",
      "{{repos_context}}",
    ].join("\n"),
    varSchema: {
      username: { type: "string", required: true },
      repos_count: { type: "number", required: true },
      repos_context: { type: "string", required: true },
      task: { type: "string", required: true },
      parent_agent_id: { type: "string" },
      current_date: { type: "string" },
    },
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

  const variableOptions = useMemo<TemplateVariableOption[]>(() => {
    const builtInVariableMap = new Map(builtInVariables.map(item => [item.name, item]));
    const names = new Set<string>([
      ...Object.keys(draftProfile.varSchema),
      ...builtInVariables.map(item => item.name),
    ]);
    return [...names].map((name) => {
      const builtInMeta = builtInVariableMap.get(name);
      const profileMeta = draftProfile.varSchema[name];
      return {
        name,
        type: profileMeta?.type || builtInMeta?.type,
        description: profileMeta?.description || builtInMeta?.description,
      };
    });
  }, [builtInVariables, draftProfile.varSchema]);

  const updateVarSchema = (
    varName: string,
    updater: (varDef: SubAgentVarDef) => SubAgentVarDef
  ) => {
    updateDraftProfile((current) => {
      const nextDef = updater(current.varSchema[varName] || { type: "string" as const });
      return {
        ...current,
        varSchema: {
          ...current.varSchema,
          [varName]: nextDef,
        },
        version: current.version + 1,
      };
    });
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

          <div className="space-y-2">
            <Label>工具白名单</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {tools.map(tool => (
                <label key={`${draftProfile.id}-${tool.id}`} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={draftProfile.toolIds.includes(tool.id)}
                    onCheckedChange={(checked) =>
                      updateDraftProfile((current) => {
                        const nextToolIds = checked
                          ? [...new Set([...current.toolIds, tool.id])]
                          : current.toolIds.filter(id => id !== tool.id);
                        return {
                          ...current,
                          toolIds: nextToolIds,
                          version: current.version + 1,
                        };
                      })}
                  />
                  <span className="truncate">{tool.name}</span>
                </label>
              ))}
            </div>
          </div>

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
              可直接使用变量占位 <code>{"{{变量名}}"}</code>。createSubAgent 仅传入任务文本，变量由运行时自动注入。
            </p>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/10 p-3">
            <div className="flex items-center justify-between">
              <Label>变量 Schema</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  updateDraftProfile(current => ({
                    ...current,
                    varSchema: {
                      ...current.varSchema,
                      [`var_${Object.keys(current.varSchema).length + 1}`]: { type: "string" },
                    },
                    version: current.version + 1,
                  }))}
              >
                <PlusIcon className="size-3.5" />
                新增变量
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              变量白名单由此处变量名决定；勾选 required 后会在执行前强制校验必填。预定义运行时变量：
              {" "}
              {PREDEFINED_RUNTIME_VARIABLES.map(item => `${item.name} (${item.type})`).join(", ")}
            </p>
            <div className="hidden grid-cols-[1fr_140px_120px] gap-2 px-1 text-xs text-muted-foreground sm:grid">
              <span>变量名</span>
              <span>类型</span>
              <span>必填</span>
            </div>
            <div className="grid gap-2 rounded-md border bg-background p-2">
              {Object.entries(draftProfile.varSchema).map(([varName, varDef]) => (
                <div
                  key={`${draftProfile.id}-${varName}`}
                  className="grid gap-2 sm:grid-cols-[1fr_140px_120px]"
                >
                  <div>
                    <Label className="text-xs text-muted-foreground sm:hidden">变量名</Label>
                    <Input
                      value={varName}
                      onChange={(event) =>
                        updateDraftProfile((current) => {
                          const nextName = event.target.value.trim();
                          if (!nextName || nextName === varName) {
                            return current;
                          }
                          const nextSchema = { ...current.varSchema };
                          nextSchema[nextName] = nextSchema[varName];
                          delete nextSchema[varName];
                          return {
                            ...current,
                            varSchema: nextSchema,
                            version: current.version + 1,
                          };
                        })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:hidden">类型</Label>
                    <Select
                      value={varDef.type}
                      onValueChange={(value) =>
                        updateVarSchema(varName, current => ({
                          ...current,
                          type: value as TemplateVariableType,
                        }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">string</SelectItem>
                        <SelectItem value="number">number</SelectItem>
                        <SelectItem value="boolean">boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground sm:hidden">必填</Label>
                    <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                      <Checkbox
                        checked={varDef.required === true}
                        onCheckedChange={(checked) =>
                          updateVarSchema(varName, current => ({
                            ...current,
                            required: checked === true,
                          }))}
                      />
                      required
                    </label>
                  </div>
                  <div className="sm:col-span-3">
                    <Label className="text-xs text-muted-foreground sm:hidden">描述</Label>
                    <Input
                      value={varDef.description || ""}
                      placeholder="变量描述（会显示在模板编辑器建议中）"
                      onChange={(event) =>
                        updateVarSchema(varName, current => ({
                          ...current,
                          description: event.target.value.trim() || undefined,
                        }))}
                    />
                  </div>
                </div>
              ))}
            </div>
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

