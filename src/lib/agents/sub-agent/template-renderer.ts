import type { SubAgentVarDef } from "./types";
import { SubAgentConfigError } from "./profile-schema";

const templateVarPattern = /\{\{\s*([a-z_]\w*)\s*\}\}/gi;

type TemplateVars = Record<string, string | number | boolean>;

const BUILTIN_VAR_TYPES: Record<string, SubAgentVarDef["type"]> = {
  username: "string",
  repos_count: "number",
  start_index: "number",
  end_index: "number",
};

export function extractTemplateVariables(template: string): string[] {
  const vars = new Set<string>();
  let match = templateVarPattern.exec(template);
  while (match) {
    vars.add(match[1]);
    match = templateVarPattern.exec(template);
  }
  templateVarPattern.lastIndex = 0;
  return [...vars];
}

function assertValueType(varName: string, value: unknown, expected: SubAgentVarDef["type"]): void {
  if (expected === "string" && typeof value !== "string") {
    throw new SubAgentConfigError("SUBAGENT_VAR_TYPE_INVALID", `Variable "${varName}" must be string`);
  }
  if (expected === "number" && typeof value !== "number") {
    throw new SubAgentConfigError("SUBAGENT_VAR_TYPE_INVALID", `Variable "${varName}" must be number`);
  }
  if (expected === "boolean" && typeof value !== "boolean") {
    throw new SubAgentConfigError("SUBAGENT_VAR_TYPE_INVALID", `Variable "${varName}" must be boolean`);
  }
}

export function buildResolvedTemplateVars(options: {
  userVars: TemplateVars;
  varSchema: Record<string, SubAgentVarDef>;
  builtinVars: TemplateVars;
}): TemplateVars {
  const { userVars, varSchema, builtinVars } = options;
  const merged: TemplateVars = {
    ...builtinVars,
  };

  for (const [name, def] of Object.entries(varSchema)) {
    if (def.defaultValue !== undefined) {
      merged[name] = def.defaultValue;
    }
  }

  for (const [name, value] of Object.entries(userVars)) {
    merged[name] = value;
  }

  for (const [name, def] of Object.entries(varSchema)) {
    if (def.required && merged[name] === undefined) {
      throw new SubAgentConfigError("SUBAGENT_VAR_MISSING", `Missing required variable "${name}"`);
    }
  }

  for (const [name, value] of Object.entries(merged)) {
    const isBuiltin = name in BUILTIN_VAR_TYPES;
    if (!isBuiltin && !(name in varSchema)) {
      throw new SubAgentConfigError("SUBAGENT_VAR_UNKNOWN", `Variable "${name}" is not defined in varSchema`);
    }

    const expectedType = varSchema[name]?.type || BUILTIN_VAR_TYPES[name];
    if (expectedType) {
      assertValueType(name, value, expectedType);
    }
  }

  return merged;
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  const rendered = template.replaceAll(templateVarPattern, (_, varName: string) => {
    const value = vars[varName];
    if (value === undefined) {
      throw new SubAgentConfigError("SUBAGENT_VAR_MISSING", `Missing variable "${varName}"`);
    }
    return String(value);
  });

  const unresolved = extractTemplateVariables(rendered);
  if (unresolved.length > 0) {
    throw new SubAgentConfigError(
      "SUBAGENT_TEMPLATE_UNRESOLVED",
      `Unresolved template variables: ${unresolved.join(", ")}`
    );
  }

  return rendered;
}
