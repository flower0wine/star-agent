// =============================================================================
// Settings Menu Component
// Dropdown menu for settings (collapsed sidebar)
// =============================================================================

"use client";

import { Settings, Info, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { ModelSelector } from "./model-selector";

interface SettingsMenuProps {
  onLogout?: () => void;
  onAbout?: () => void;
}

export function SettingsMenu({ onLogout, onAbout }: SettingsMenuProps) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          aria-label="Open settings"
        >
          <Settings className="mr-2 size-4" />
          <span>Settings</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Theme */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuItem className="p-0">
          <ThemeToggle className="w-full justify-center" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Model */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          AI Model
        </DropdownMenuLabel>
        <DropdownMenuItem className="p-0">
          <ModelSelector className="w-full" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* About */}
        <DropdownMenuItem onClick={handleAbout}>
          <Info className="mr-2 size-4" />
          <span>About</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
