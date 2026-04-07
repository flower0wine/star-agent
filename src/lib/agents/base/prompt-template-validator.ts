const VAR_PATTERN = /\{\{\s*([a-z_]\w*)\s*\}\}/gi;

export function extractPromptTemplateVariables(template: string): string[] {
  const vars = new Set<string>();
  let match = VAR_PATTERN.exec(template);

  while (match) {
    vars.add(match[1]);
    match = VAR_PATTERN.exec(template);
  }
  VAR_PATTERN.lastIndex = 0;

  return [...vars];
}

export function findUnknownPromptVariables(template: string, allowedVars: string[]): string[] {
  const allowed = new Set(allowedVars);
  return extractPromptTemplateVariables(template).filter(name => !allowed.has(name));
}

