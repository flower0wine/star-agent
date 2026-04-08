import { z } from "zod";
import type { SubAgentProfile } from "./types";

const variableNameRegex = /^[a-z_]\w*$/i;

const subAgentVarDefSchema = z.object({
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
});

const subAgentToolConfigSchema = z.object({
  enabled: z.boolean().optional(),
  defaultInput: z.record(z.string(), z.unknown()).optional(),
  boundSubAgentIds: z.array(z.string().min(1)).optional(),
  dynamicParameters: z.unknown().optional(),
});

const subAgentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  toolConfigs: z.record(z.string().min(1), subAgentToolConfigSchema),
  systemPromptTemplate: z.string().min(1),
  varSchema: z.record(z.string().regex(variableNameRegex), subAgentVarDefSchema),
  limits: z.object({
    timeoutMs: z.number().int().min(1000).max(600000),
  }),
  version: z.number().int().min(1),
});

const subAgentProfilesSchema = z.array(subAgentProfileSchema);

function formatProfileSchemaIssue(issue: z.ZodIssue): string {
  const path = issue.path;
  const profileIndex = typeof path[0] === "number" ? path[0] : undefined;
  const field = typeof path[1] === "string" ? path[1] : undefined;

  if (
    field === "toolConfigs"
    && issue.code === "invalid_type"
    && "received" in issue
    && issue.received === "undefined"
  ) {
    const indexText = profileIndex === undefined ? "" : `第 ${profileIndex + 1} 个`;
    return `${indexText} SubAgent Profile 缺少 "toolConfigs" 配置（常见于旧版本数据）。请在设置页打开对应 Profile 并保存一次，或新建 Profile。`;
  }

  if (
    field === "name"
    && issue.code === "too_small"
  ) {
    const indexText = profileIndex === undefined ? "" : `第 ${profileIndex + 1} 个`;
    return `${indexText} SubAgent Profile 的名称不能为空。`;
  }

  if (
    field === "id"
    && issue.code === "too_small"
  ) {
    const indexText = profileIndex === undefined ? "" : `第 ${profileIndex + 1} 个`;
    return `${indexText} SubAgent Profile 的 ID 不能为空。`;
  }

  return `${path.join(".")}: ${issue.message}`;
}

export class SubAgentConfigError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SubAgentConfigError";
    this.code = code;
  }
}

export function parseSubAgentProfiles(raw: unknown): SubAgentProfile[] {
  const parsed = subAgentProfilesSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SubAgentConfigError(
      "SUBAGENT_PROFILE_SCHEMA_INVALID",
      parsed.error.issues.map(formatProfileSchemaIssue).join("; ")
    );
  }

  const ids = new Set<string>();
  for (const profile of parsed.data) {
    if (ids.has(profile.id)) {
      throw new SubAgentConfigError("SUBAGENT_PROFILE_DUPLICATED", `Duplicated profile id: ${profile.id}`);
    }
    ids.add(profile.id);
  }

  return parsed.data;
}

export function resolveEnabledProfilesForAgent(
  customParams: Record<string, unknown> | undefined
): SubAgentProfile[] {
  const rawProfiles = customParams?.subAgentProfiles;
  if (!rawProfiles) {
    return [];
  }
  const profiles = parseSubAgentProfiles(rawProfiles);
  return profiles.filter(profile => profile.enabled);
}
