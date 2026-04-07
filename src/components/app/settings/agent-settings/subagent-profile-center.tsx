import { CopyIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  SubAgentProfile,
  SubAgentTaskTemplate,
  SubAgentVarDef,
  TemplateVariableType,
} from "@/lib/agents/sub-agent/types";
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
  defaultParentAgentId: string;
  profiles: SubAgentProfile[];
  onChange: (profiles: SubAgentProfile[]) => Promise<void> | void;
}

function createDefaultTemplate(index: number): SubAgentTaskTemplate {
  return {
    id: `template-${index}`,
    name: `Template ${index}`,
    instructionTemplate: "请基于 {{username}} 的仓库列表完成分析，并输出重点结论。",
    requiredVars: ["username"],
    allowedVars: ["username", "repos_count"],
  };
}

function createDefaultProfile(parentAgentId: string, index: number): SubAgentProfile {
  return {
    id: `profile-${index}`,
    name: `SubAgent ${index}`,
    enabled: true,
    parentAgentIds: [parentAgentId],
    toolIds: ["searchRepositories", "getRepositoryReadme"],
    systemPromptTemplate: [
      "你是一个由用户配置的子 Agent。",
      "用户: {{username}}",
      "仓库数量: {{repos_count}}",
      "仓库上下文:",
      "{{repos_context}}",
    ].join("\n"),
    templates: [createDefaultTemplate(1)],
    varSchema: {
      username: { type: "string", required: true },
      repos_count: { type: "number", required: true },
    },
    limits: {
      maxConcurrency: 2,
      timeoutMs: 120000,
      maxInputItems: 200,
    },
    version: 1,
  };
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

export function SubAgentProfileCenter({
  defaultParentAgentId,
  profiles,
  onChange,
}: SubAgentProfileCenterProps) {
  const tools = useMemo(() => getSubAgentCompatibleTools(), []);
  const builtInVariables = useMemo(() => ["username", "repos_count", "repos_context", "start_index", "end_index"], []);
  const [draftProfiles, setDraftProfiles] = useState<SubAgentProfile[]>(profiles);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraftProfiles(profiles);
    setIsDirty(false);
  }, [profiles]);

  const updateDraftProfiles = (updater: (current: SubAgentProfile[]) => SubAgentProfile[]) => {
    setDraftProfiles((current) => {
      const next = updater(current);
      return next;
    });
    setIsDirty(true);
  };

  const upsertProfile = (profileId: string, updater: (profile: SubAgentProfile) => SubAgentProfile) => {
    updateDraftProfiles(current => current.map(profile => (profile.id === profileId ? updater(profile) : profile)));
  };

  const handleAddProfile = () => {
    const index = draftProfiles.length + 1;
    updateDraftProfiles(current => [...current, createDefaultProfile(defaultParentAgentId, index)]);
  };

  const handleDuplicateProfile = (profileId: string) => {
    const profile = draftProfiles.find(item => item.id === profileId);
    if (!profile) {
      return;
    }
    const duplicatedId = `${profile.id}-copy-${Date.now().toString().slice(-4)}`;
    updateDraftProfiles(current => [
      ...current,
      {
        ...profile,
        id: duplicatedId,
        name: `${profile.name} Copy`,
        version: profile.version + 1,
      },
    ]);
  };

  const handleDeleteProfile = (profileId: string) => {
    updateDraftProfiles(current => current.filter(profile => profile.id !== profileId));
  };

  const handleReset = () => {
    setDraftProfiles(profiles);
    setIsDirty(false);
  };

  const handleSave = async () => {
    if (!isDirty || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onChange(draftProfiles);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTemplate = (
    profileId: string,
    templateId: string,
    updater: (template: SubAgentTaskTemplate) => SubAgentTaskTemplate
  ) => {
    upsertProfile(profileId, (profile) => ({
      ...profile,
      templates: profile.templates.map(template => (template.id === templateId ? updater(template) : template)),
      version: profile.version + 1,
    }));
  };

  const updateVarSchema = (
    profileId: string,
    varName: string,
    updater: (varDef: SubAgentVarDef) => SubAgentVarDef
  ) => {
    upsertProfile(profileId, (profile) => {
      const nextDef = updater(profile.varSchema[varName] || { type: "string" as const });
      return {
        ...profile,
        varSchema: {
          ...profile.varSchema,
          [varName]: nextDef,
        },
        version: profile.version + 1,
      };
    });
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2 px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>SubAgent Profiles</CardTitle>
            <CardDescription>用户定义并复用子 Agent 配置（tools / prompts / templates / vars）。</CardDescription>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={handleAddProfile}>
            <PlusIcon className="size-3.5" />
            新建 Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {draftProfiles.length === 0 && (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            当前没有 SubAgent Profile，请先创建。
          </div>
        )}

        {draftProfiles.map((profile) => {
          const variableOptions = [...new Set([...Object.keys(profile.varSchema), ...builtInVariables])];

          return (
            <div key={profile.id} className="space-y-3 rounded-xl border border-border/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{profile.version}</Badge>
                  <Badge variant={profile.enabled ? "default" : "secondary"}>
                    {profile.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateProfile(profile.id)}
                  >
                    <CopyIcon className="size-3.5" />
                    复制
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteProfile(profile.id)}
                  >
                    <TrashIcon className="size-3.5" />
                    删除
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Profile ID</Label>
                  <Input
                    value={profile.id}
                    onChange={(event) =>
                      upsertProfile(profile.id, current => ({ ...current, id: event.target.value.trim() || current.id }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input
                    value={profile.name}
                    onChange={(event) =>
                      upsertProfile(profile.id, current => ({ ...current, name: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
                <Label htmlFor={`profile-enabled-${profile.id}`}>启用</Label>
                <Switch
                  id={`profile-enabled-${profile.id}`}
                  checked={profile.enabled}
                  onCheckedChange={checked =>
                    upsertProfile(profile.id, current => ({
                      ...current,
                      enabled: checked,
                      version: current.version + 1,
                    }))}
                />
              </div>

              <div className="space-y-2">
                <Label>可调度的父 Agent IDs（逗号分隔）</Label>
                <Input
                  value={profile.parentAgentIds.join(",")}
                  onChange={(event) =>
                    upsertProfile(profile.id, current => ({
                      ...current,
                      parentAgentIds: parseCommaSeparated(event.target.value),
                      version: current.version + 1,
                    }))}
                />
              </div>

              <div className="space-y-2">
                <Label>工具白名单</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {tools.map(tool => (
                    <label key={`${profile.id}-${tool.id}`} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox
                        checked={profile.toolIds.includes(tool.id)}
                        onCheckedChange={(checked) =>
                          upsertProfile(profile.id, (current) => {
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
                  value={profile.systemPromptTemplate}
                  variables={variableOptions}
                  onChange={(nextValue) =>
                    upsertProfile(profile.id, current => ({
                      ...current,
                      systemPromptTemplate: nextValue,
                      version: current.version + 1,
                    }))}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>任务模板</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      upsertProfile(profile.id, current => ({
                        ...current,
                        templates: [...current.templates, createDefaultTemplate(current.templates.length + 1)],
                        version: current.version + 1,
                      }))}
                  >
                    <PlusIcon className="size-3.5" />
                    新增模板
                  </Button>
                </div>
                {profile.templates.map(template => (
                  <div key={template.id} className="space-y-2 rounded-md border p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        value={template.id}
                        onChange={(event) =>
                          updateTemplate(profile.id, template.id, current => ({ ...current, id: event.target.value }))}
                      />
                      <Input
                        value={template.name}
                        onChange={(event) =>
                          updateTemplate(profile.id, template.id, current => ({ ...current, name: event.target.value }))}
                      />
                    </div>
                    <TemplateVariableTextarea
                      rows={3}
                      value={template.instructionTemplate}
                      variables={variableOptions}
                      onChange={(nextValue) =>
                        updateTemplate(profile.id, template.id, current => ({
                          ...current,
                          instructionTemplate: nextValue,
                        }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      必填变量用于执行前校验；允许变量用于限制该模板可使用的变量范围。
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>必填变量 (requiredVars)</Label>
                        <Input
                          value={template.requiredVars.join(",")}
                          onChange={(event) =>
                            updateTemplate(profile.id, template.id, current => ({
                              ...current,
                              requiredVars: parseCommaSeparated(event.target.value),
                            }))}
                          placeholder="例如: username,repos_count"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>允许变量 (allowedVars)</Label>
                        <Input
                          value={template.allowedVars.join(",")}
                          onChange={(event) =>
                            updateTemplate(profile.id, template.id, current => ({
                              ...current,
                              allowedVars: parseCommaSeparated(event.target.value),
                            }))}
                          placeholder="例如: username,repos_count,repos_context"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>变量 Schema</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      upsertProfile(profile.id, current => ({
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
                {Object.entries(profile.varSchema).map(([varName, varDef]) => (
                  <div key={`${profile.id}-${varName}`} className="grid gap-2 sm:grid-cols-[1fr_140px_120px]">
                    <Input
                      value={varName}
                      onChange={(event) =>
                        upsertProfile(profile.id, (current) => {
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
                    <Select
                      value={varDef.type}
                      onValueChange={(value) =>
                        updateVarSchema(profile.id, varName, current => ({
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
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={varDef.required === true}
                        onCheckedChange={(checked) =>
                          updateVarSchema(profile.id, varName, current => ({
                            ...current,
                            required: checked === true,
                          }))}
                      />
                      required
                    </label>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>maxConcurrency</Label>
                  <Input
                    type="number"
                    min={1}
                    value={String(profile.limits.maxConcurrency)}
                    onChange={(event) =>
                      upsertProfile(profile.id, current => ({
                        ...current,
                        limits: {
                          ...current.limits,
                          maxConcurrency: Number(event.target.value) || 1,
                        },
                        version: current.version + 1,
                      }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>timeoutMs</Label>
                  <Input
                    type="number"
                    min={1000}
                    value={String(profile.limits.timeoutMs)}
                    onChange={(event) =>
                      upsertProfile(profile.id, current => ({
                        ...current,
                        limits: {
                          ...current.limits,
                          timeoutMs: Number(event.target.value) || 120000,
                        },
                        version: current.version + 1,
                      }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>maxInputItems</Label>
                  <Input
                    type="number"
                    min={1}
                    value={String(profile.limits.maxInputItems || "")}
                    onChange={(event) =>
                      upsertProfile(profile.id, current => ({
                        ...current,
                        limits: {
                          ...current.limits,
                          maxInputItems: Number(event.target.value) || undefined,
                        },
                        version: current.version + 1,
                      }))}
                  />
                </div>
              </div>
            </div>
          );
        })}

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
