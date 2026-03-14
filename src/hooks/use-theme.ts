// =============================================================================
// Theme Hook
// Provides theme state and actions with system theme detection
// =============================================================================

"use client";

import { useEffect, useCallback } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import type { Theme } from "@/types/settings";

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const isHydrated = useSettingsStore((state) => state.isHydrated);

  // Listen for system theme changes when theme is set to "system"
  useEffect(() => {
    if (theme !== "system" || !isHydrated)
      return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Re-apply system theme by calling setTheme
      setTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, setTheme, isHydrated]);

  // Toggle theme cycle: light -> dark -> system -> light
  const toggleTheme = useCallback(() => {
    const themeOrder: Theme[] = ["light", "dark", "system"];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [theme, setTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isSystemTheme: theme === "system",
    isHydrated,
  };
}
