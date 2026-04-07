import { z } from "zod";
import type { SubAgentProfile } from "./types";

const variableNameRegex = /^[a-z_]\w*$/i;

const subAgentVarDefSchema = z.object({
  type: z.enum(["string", "number", "boolean"]),
  required: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  description: z.string().optional(),
});

const subAgentProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean(),
  toolIds: z.array(z.string().min(1)).min(1),
  systemPromptTemplate: z.string().min(1),
  taskDescriptionRequirement: z.string().min(1),
  varSchema: z.record(z.string().regex(variableNameRegex), subAgentVarDefSchema),
  limits: z.object({
    timeoutMs: z.number().int().min(1000).max(600000),
  }),
  version: z.number().int().min(1),
});

const subAgentProfilesSchema = z.array(subAgentProfileSchema);

function normalizeLegacyProfiles(raw: unknown): unknown {
  if (!Array.isArray(raw)) {
    return raw;
  }

  return raw.map((item) => {
    if (!item || typeof item !== "object") {
      return item;
    }

    const profile = item as Record<string, unknown>;
    if (typeof profile.taskDescriptionRequirement === "string" && profile.taskDescriptionRequirement.trim().length > 0) {
      return profile;
    }

    const templates = profile.templates;
    if (!Array.isArray(templates) || templates.length === 0) {
      return profile;
    }

    const firstTemplate = templates[0];
    if (!firstTemplate || typeof firstTemplate !== "object") {
      return profile;
    }

    const instructionTemplate = (firstTemplate as Record<string, unknown>).instructionTemplate;
    if (typeof instructionTemplate !== "string" || instructionTemplate.trim().length === 0) {
      return profile;
    }

    return {
      ...profile,
      taskDescriptionRequirement: instructionTemplate,
    };
  });
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
  const normalized = normalizeLegacyProfiles(raw);
  const parsed = subAgentProfilesSchema.safeParse(normalized);
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
