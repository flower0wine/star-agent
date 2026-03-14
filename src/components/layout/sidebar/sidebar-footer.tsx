"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info, LogOutIcon, MoonIcon, SunIcon } from "lucide-react";
import { useState } from "react";

interface SidebarFooterProps {
  isExpanded: boolean;
}

export function SidebarFooter({ isExpanded }: SidebarFooterProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    // TODO: Implement theme toggle
    document.documentElement.classList.toggle("dark");
  };

  const handleLogout = () => {
    // TODO: Implement logout
    console.log("Logout clicked");
  };

  const handleAbout = () => {
    // TODO: Implement about dialog
    console.log("About clicked");
  };

  return (
    <div className="border-t border-sidebar-border p-3">
      <Separator className="mb-3" />

      <div className={cn("flex flex-col gap-1", !isExpanded && "items-center")}>
        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "flex items-center justify-start gap-2",
                isExpanded ? "w-full px-3" : "size-9 justify-center"
              )}
              onClick={toggleTheme}
              size="icon"
              variant="ghost"
            >
              {theme === "light" ? (
                <>
                  <MoonIcon className="size-4 shrink-0" />
                  {isExpanded && <span>Dark Mode</span>}
                </>
              ) : (
                <>
                  <SunIcon className="size-4 shrink-0" />
                  {isExpanded && <span>Light Mode</span>}
                </>
              )}
            </Button>
          </TooltipTrigger>
          {!isExpanded && (
            <TooltipContent side="right">Toggle theme</TooltipContent>
          )}
        </Tooltip>

        {/* About */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "flex items-center justify-start gap-2",
                isExpanded ? "w-full px-3" : "size-9 justify-center"
              )}
              onClick={handleAbout}
              size="icon"
              variant="ghost"
            >
              <Info className="size-4 shrink-0" />
              {isExpanded && <span>About</span>}
            </Button>
          </TooltipTrigger>
          {!isExpanded && <TooltipContent side="right">About</TooltipContent>}
        </Tooltip>

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "flex items-center justify-start gap-2",
                isExpanded ? "w-full px-3" : "size-9 justify-center"
              )}
              onClick={handleLogout}
              size="icon"
              variant="ghost"
            >
              <LogOutIcon className="size-4 shrink-0" />
              {isExpanded && <span>Logout</span>}
            </Button>
          </TooltipTrigger>
          {!isExpanded && <TooltipContent side="right">Logout</TooltipContent>}
        </Tooltip>
      </div>
    </div>
  );
}
