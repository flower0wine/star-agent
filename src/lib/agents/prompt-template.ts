import dayjs from "dayjs";

const PROMPT_VAR_PATTERN = /\{\{\s*([a-z_]\w*)\s*\}\}/gi;

export type PromptTemplateVars = Record<string, string | number | boolean>;

export interface PromptConfigLike {
  systemPromptTemplate?: string;
}

export function renderPromptTemplate(
  template: string,
  vars: PromptTemplateVars
): string {
  return template.replaceAll(PROMPT_VAR_PATTERN, (full, varName: string) => {
    const value = vars[varName];
    if (value === undefined) {
      return full;
    }
    return String(value);
  });
}

export function createPromptTemplateVars(input: {
  username?: string;
  reposCount?: number;
  extras?: Record<string, string | number | boolean>;
}): PromptTemplateVars {
  return {
    username: input.username || "",
    repos_count: input.reposCount || 0,
    current_date: dayjs().format("YYYY-MM-DD"),
    ...(input.extras || {}),
  };
}

export function applyPromptConfig(
  defaultSystemPromptTemplate: string,
  config: PromptConfigLike,
  vars: PromptTemplateVars
): string {
  const template = config.systemPromptTemplate?.trim() || defaultSystemPromptTemplate;
  return renderPromptTemplate(template, vars);
}
