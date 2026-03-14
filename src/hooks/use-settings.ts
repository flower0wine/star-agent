// =============================================================================
// Settings Hook
// Provides access to all settings and actions
// =============================================================================

"use client";

import { useSettingsStore } from "@/stores/settings-store";

export function useSettings() {
  const settings = useSettingsStore();
  const {
    theme,
    resolvedTheme,
    fontSize,
    model,
    streamingEnabled,
    sidebarExpanded,
    autoScroll,
    language,
    isHydrated,
    hydrate,
    setTheme,
    setModel,
    setFontSize,
    setSidebarExpanded,
    setAutoScroll,
    setStreamingEnabled,
    setLanguage,
    reset,
  } = settings;

  return {
    // State
    theme,
    resolvedTheme,
    fontSize,
    model,
    streamingEnabled,
    sidebarExpanded,
    autoScroll,
    language,
    isHydrated,

    // Actions
    hydrate,
    setTheme,
    setModel,
    setFontSize,
    setSidebarExpanded,
    setAutoScroll,
    setStreamingEnabled,
    setLanguage,
    reset,
  };
}
