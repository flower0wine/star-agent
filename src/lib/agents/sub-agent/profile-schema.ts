import { z } from "zod";
import type { SubAgentProfile } from "./types";

const variableNameRegex = /^[a-z_]\w*$/i;

const subAgentVarDefSchema = z.object({
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
});

const subAgentTaskTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  instructionTemplate: z.string().min(1),
  requiredVars: z.array(z.string().regex(variableNameRegex)),
  allowedVars: z.array(z.string().regex(variableNameRegex)),
});

const subAgentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  parentAgentIds: z.array(z.string().min(1)).min(1),
  toolIds: z.array(z.string().min(1)).min(1),
  systemPromptTemplate: z.string().min(1),
  templates: z.array(subAgentTaskTemplateSchema).min(1),
  varSchema: z.record(z.string().regex(variableNameRegex), subAgentVarDefSchema),
  limits: z.object({
    maxConcurrency: z.number().int().min(1).max(50),
    timeoutMs: z.number().int().min(1000).max(600000),
    maxInputItems: z.number().int().min(1).max(2000).optional(),
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

    const templateIds = new Set<string>();
    for (const template of profile.templates) {
      if (templateIds.has(template.id)) {
        throw new SubAgentConfigError(
          "SUBAGENT_TEMPLATE_DUPLICATED",
          `Duplicated template id in profile "${profile.id}": ${template.id}`
        );
      }
      templateIds.add(template.id);

      for (const requiredVar of template.requiredVars) {
        if (!template.allowedVars.includes(requiredVar)) {
          throw new SubAgentConfigError(
            "SUBAGENT_TEMPLATE_REQUIRED_NOT_ALLOWED",
            `Template "${template.id}" required var "${requiredVar}" not in allowedVars`
          );
        }
      }
    }
  }

  return parsed.data;
}

export function resolveEnabledProfilesForAgent(
  customParams: Record<string, unknown> | undefined,
  parentAgentId: string
): SubAgentProfile[] {
  const rawProfiles = customParams?.subAgentProfiles;
  if (!rawProfiles) {
    return [];
  }
  const profiles = parseSubAgentProfiles(rawProfiles);
  return profiles.filter(profile => profile.enabled && profile.parentAgentIds.includes(parentAgentId));
}
