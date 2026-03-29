import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsState {
  // Appearance
  theme: ThemeMode;

  // AI Model
  defaultModel: string;

  // Conversation
  historyRetentionDays: number;
  autoSaveEnabled: boolean;

  // Sidebar
  sidebarCollapsed: boolean;
}

interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  setDefaultModel: (model: string) => void;
  setHistoryRetentionDays: (days: number) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  resetSettings: () => void;
}

type SettingsStore = SettingsActions & SettingsState;

const defaultSettings: SettingsState = {
  theme: "system",
  defaultModel: "gpt-4o-mini",
  historyRetentionDays: 30,
  autoSaveEnabled: true,
  sidebarCollapsed: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),

      setDefaultModel: (defaultModel) => set({ defaultModel }),

      setHistoryRetentionDays: (historyRetentionDays) => set({ historyRetentionDays }),

      setAutoSaveEnabled: (autoSaveEnabled) => set({ autoSaveEnabled }),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "star-agent-settings",
    }
  )
);

// Available models configuration
export const AVAILABLE_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
] as const;

// History retention options
export const HISTORY_RETENTION_OPTIONS = [
  { value: 7, label: "7 天" },
  { value: 14, label: "14 天" },
  { value: 30, label: "30 天" },
  { value: 60, label: "60 天" },
  { value: 90, label: "90 天" },
  { value: -1, label: "永久保留" },
] as const;
