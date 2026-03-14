// =============================================================================
// Theme Toggle Component
// Allows users to switch between light, dark, and system theme
// =============================================================================

"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";
import type { Theme } from "@/types/settings";

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md bg-muted p-1",
        className
      )}
      role="group"
      aria-label="Theme selection"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            onClick={async () => { await setTheme(option.value); }}
            className={cn(
              "flex items-center justify-center rounded-sm p-2 transition-all duration-200",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            title={option.label}
            aria-label={`Switch to ${option.label} theme`}
            aria-pressed={isActive}
          >
            <Icon className="size-4" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
