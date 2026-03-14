// =============================================================================
// Settings Type Definitions
// =============================================================================

export type Theme = "light" | "dark" | "system";
export type FontSize = "sm" | "md" | "lg";

export interface AppSettings {
  // Appearance
  theme: Theme;
  fontSize: FontSize;

  // AI
  model: string;
  streamingEnabled: boolean;

  // Behavior
  sidebarExpanded: boolean;
  autoScroll: boolean;

  // Language
  language: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  fontSize: "md",
  model: "anthropic/claude-3.5-sonnet",
  streamingEnabled: true,
  sidebarExpanded: true,
  autoScroll: true,
  language: "en",
};

// Available models for selection
export const AVAILABLE_MODELS = [
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
] as const;

export type AvailableModel = (typeof AVAILABLE_MODELS)[number]["id"];
