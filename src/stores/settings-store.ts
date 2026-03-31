import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export interface SettingsState {
  // Appearance
  theme: ThemeMode;

  // AI Model
  defaultProviderId: string;
  defaultModelId: string;
  providerApiKeys: Record<string, string>;

  // Conversation
  historyRetentionDays: number;
  autoSaveEnabled: boolean;

  // Sidebar
  sidebarCollapsed: boolean;
}

interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  setDefaultProviderId: (providerId: string) => void;
  setDefaultModelId: (modelId: string) => void;
  setDefaultModelSelection: (providerId: string, modelId: string) => void;
  setProviderApiKey: (providerId: string, apiKey: string) => void;
  setHistoryRetentionDays: (days: number) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  resetSettings: () => void;
}

type SettingsStore = SettingsActions & SettingsState;

const defaultSettings: SettingsState = {
  theme: "system",
  defaultProviderId: "",
  defaultModelId: "",
  providerApiKeys: {},
  historyRetentionDays: 30,
  autoSaveEnabled: true,
  sidebarCollapsed: false,
};

interface PersistedSettingsState {
  state?: Partial<SettingsState> & {
    defaultModel?: string;
  };
}

function migrateLegacyState(persistedState: unknown): SettingsState {
  const typedState = (persistedState || {}) as PersistedSettingsState;
  const state = typedState.state || {};

  // v1 compatibility: defaultModel was a single model id (OpenAI provider only)
  const legacyDefaultModel = typeof state.defaultModel === "string" ? state.defaultModel : "";

  return {
    ...defaultSettings,
    ...state,
    defaultProviderId: state.defaultProviderId || (legacyDefaultModel ? "openai" : defaultSettings.defaultProviderId),
    defaultModelId: state.defaultModelId || legacyDefaultModel || defaultSettings.defaultModelId,
    providerApiKeys: state.providerApiKeys || {},
  };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) =>
        set((state) => (state.theme === theme ? state : { theme })),

      setDefaultProviderId: (defaultProviderId) =>
        set((state) => (state.defaultProviderId === defaultProviderId ? state : { defaultProviderId })),

      setDefaultModelId: (defaultModelId) =>
        set((state) => (state.defaultModelId === defaultModelId ? state : { defaultModelId })),

      setDefaultModelSelection: (defaultProviderId, defaultModelId) =>
        set((state) => {
          if (
            state.defaultProviderId === defaultProviderId
            && state.defaultModelId === defaultModelId
          ) {
            return state;
          }

          return {
            defaultProviderId,
            defaultModelId,
          };
        }),

      setProviderApiKey: (providerId, apiKey) =>
        set((state) => {
          if (state.providerApiKeys[providerId] === apiKey) {
            return state;
          }

          return {
            providerApiKeys: {
              ...state.providerApiKeys,
              [providerId]: apiKey,
            },
          };
        }),

      setHistoryRetentionDays: (historyRetentionDays) =>
        set((state) => (state.historyRetentionDays === historyRetentionDays ? state : { historyRetentionDays })),

      setAutoSaveEnabled: (autoSaveEnabled) =>
        set((state) => (state.autoSaveEnabled === autoSaveEnabled ? state : { autoSaveEnabled })),

      setSidebarCollapsed: (sidebarCollapsed) =>
        set((state) => (state.sidebarCollapsed === sidebarCollapsed ? state : { sidebarCollapsed })),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: "star-agent-settings",
      version: 2,
      migrate: (persistedState) => migrateLegacyState(persistedState),
      partialize: (state) => ({
        theme: state.theme,
        defaultProviderId: state.defaultProviderId,
        defaultModelId: state.defaultModelId,
        providerApiKeys: state.providerApiKeys,
        historyRetentionDays: state.historyRetentionDays,
        autoSaveEnabled: state.autoSaveEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// History retention options
export const HISTORY_RETENTION_OPTIONS = [
  { value: 7, label: "7 天" },
  { value: 14, label: "14 天" },
  { value: 30, label: "30 天" },
  { value: 60, label: "60 天" },
  { value: 90, label: "90 天" },
  { value: -1, label: "永久保留" },
] as const;

