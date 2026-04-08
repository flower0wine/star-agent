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
      parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ")
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
