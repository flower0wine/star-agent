import { SubAgentConfigError } from "./profile-schema";

const templateVarPattern = /\{\{\s*([a-z_]\w*)\s*\}\}/gi;

type TemplateVars = Record<string, string | number | boolean>;

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
