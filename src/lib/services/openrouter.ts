// OpenRouter models are configured directly via model string ID
// No separate import needed - Mastra v1 uses OpenAI-compatible API

export const modelOptions = {
  default: "anthropic/claude-3.5-sonnet",
  alternatives: [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
    { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  ],
} as const;

export type ModelId = (typeof modelOptions)["alternatives"][number]["id"];

export function getModelId(model: string): ModelId {
  const found = modelOptions.alternatives.find((m) => m.id === model);
  return found?.id ?? modelOptions.default;
}
