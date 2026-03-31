import type { ReactNode } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

import { SettingsSectionShell } from "../settings-section-shell";

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function ThemeButton({ active, onClick, icon, label }: ThemeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
        active ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:bg-muted"
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );
}

export function AppearanceSettingsSection() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsSectionShell title="外观" description="自定义应用程序的显示风格。">
      <div className="space-y-4">
        <div className="text-sm font-medium">主题模式</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ThemeButton
            active={theme === "light"}
            onClick={() => setTheme("light")}
            icon={<SunIcon className="size-5" />}
            label="浅色"
          />
          <ThemeButton
            active={theme === "dark"}
            onClick={() => setTheme("dark")}
            icon={<MoonIcon className="size-5" />}
            label="深色"
          />
          <ThemeButton
            active={theme === "system"}
            onClick={() => setTheme("system")}
            icon={<MonitorIcon className="size-5" />}
            label="跟随系统"
          />
        </div>
      </div>
    </SettingsSectionShell>
  );
}
