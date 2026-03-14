// =============================================================================
// Settings Store (Zustand)
// Manages application settings state with persistence
// =============================================================================

import { create } from "zustand";
import type { AppSettings, Theme, FontSize } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { settingsStorage } from "@/lib/storage/settings-storage";

interface SettingsStore extends AppSettings {
  // Computed
  resolvedTheme: "light" | "dark";

  // Initialization
  isHydrated: boolean;
  hydrate: () => Promise<void>;

  // Actions
  setTheme: (theme: Theme) => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setFontSize: (fontSize: FontSize) => Promise<void>;
  setSidebarExpanded: (expanded: boolean) => Promise<void>;
  setAutoScroll: (autoScroll: boolean) => Promise<void>;
  setStreamingEnabled: (enabled: boolean) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
  reset: () => Promise<void>;
}

// Helper to resolve system theme
function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }
  return theme;
}

// Helper to apply theme to document
function applyTheme(resolved: "light" | "dark"): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // Initial state (will be hydrated from storage)
  ...DEFAULT_SETTINGS,
  resolvedTheme: "light",
  isHydrated: false,

  // Hydrate from storage
  hydrate: async () => {
    try {
      const settings = await settingsStorage.load();
      const resolved = resolveTheme(settings.theme);
      applyTheme(resolved);

      set({
        ...settings,
        resolvedTheme: resolved,
        isHydrated: true,
      });
    } catch (error) {
      console.error("Failed to hydrate settings:", error);
      const resolved = resolveTheme(DEFAULT_SETTINGS.theme);
      applyTheme(resolved);
      set({
        ...DEFAULT_SETTINGS,
        resolvedTheme: resolved,
        isHydrated: true,
      });
    }
  },

  // Set theme
  setTheme: async (theme) => {
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
    await settingsStorage.set("theme", theme);
  },

  // Set model
  setModel: async (model) => {
    set({ model });
    await settingsStorage.set("model", model);
  },

  // Set font size
  setFontSize: async (fontSize) => {
    set({ fontSize });
    await settingsStorage.set("fontSize", fontSize);
  },

  // Set sidebar expanded
  setSidebarExpanded: async (sidebarExpanded) => {
    set({ sidebarExpanded });
    await settingsStorage.set("sidebarExpanded", sidebarExpanded);
  },

  // Set auto scroll
  setAutoScroll: async (autoScroll) => {
    set({ autoScroll });
    await settingsStorage.set("autoScroll", autoScroll);
  },

  // Set streaming enabled
  setStreamingEnabled: async (streamingEnabled) => {
    set({ streamingEnabled });
    await settingsStorage.set("streamingEnabled", streamingEnabled);
  },

  // Set language
  setLanguage: async (language) => {
    set({ language });
    await settingsStorage.set("language", language);
  },

  // Reset to defaults
  reset: async () => {
    const resolved = resolveTheme(DEFAULT_SETTINGS.theme);
    applyTheme(resolved);
    set({
      ...DEFAULT_SETTINGS,
      resolvedTheme: resolved,
    });
    await settingsStorage.reset();
  },
}));
