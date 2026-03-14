// =============================================================================
// Settings Section Component
// Inline settings display for expanded sidebar
// =============================================================================

"use client";

import { Info, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { ModelSelector } from "./model-selector";

interface SettingsSectionProps {
  onLogout?: () => void;
  onAbout?: () => void;
}

export function SettingsSection({ onLogout, onAbout }: SettingsSectionProps) {
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const handleAbout = () => {
    if (onAbout) {
      onAbout();
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Theme */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle className="w-full justify-center" />
      </div>

      {/* Model */}
      <div className="space-y-2">
        <span className="text-xs text-muted-foreground">Model</span>
        <ModelSelector className="w-full" />
      </div>

      <Separator />

      {/* About */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={handleAbout}
      >
        <Info className="mr-2 size-4" />
        About
      </Button>

      {/* Logout */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-destructive hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 size-4" />
        Logout
      </Button>
    </div>
  );
}
