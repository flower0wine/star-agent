import { motion } from "motion/react";
import { ArrowLeftIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { SettingsSection, SettingsSectionItem } from "./settings-types";

interface SettingsSectionNavProps {
  sections: SettingsSectionItem[];
  activeSection: SettingsSection;
  onChange: (section: SettingsSection) => void;
  onBack: () => void;
}

export function SettingsSectionNav({
  sections,
  activeSection,
  onChange,
  onBack,
}: SettingsSectionNavProps) {
  return (
    <aside className="w-56 border-r bg-muted/20 p-3">
      <div className="mb-2 space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="w-full justify-start gap-2 rounded-lg"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4" />
          返回对话页
        </Button>
        <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground">设置面板</div>
      </div>
      <div className="space-y-1">
        {sections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={cn(
                "relative flex w-full items-start gap-3 overflow-hidden rounded-lg px-3 py-2 text-left transition-colors",
                "hover:bg-accent/80",
                isActive ? "text-accent-foreground" : "text-foreground/80"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="settings-active-item"
                  className="absolute inset-0 rounded-lg border bg-accent"
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                />
              )}
              <span className="relative z-10 mt-0.5">{section.icon}</span>
              <span className="relative z-10 min-w-0">
                <span className="block text-sm font-medium">{section.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{section.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
