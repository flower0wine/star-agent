"use client";

import { useLayout } from "@/hooks/use-layout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StarIcon } from "lucide-react";
import { motion } from "motion/react";

interface SidebarHeaderProps {
  isExpanded: boolean;
}

export function SidebarHeader({ isExpanded }: SidebarHeaderProps) {
  const { toggleSidebar } = useLayout();

  return (
    <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
      <div className="flex items-center gap-2 overflow-hidden">
        <motion.div
          animate={{ scale: 1 }}
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary"
          initial={{ scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <StarIcon className="size-4 text-sidebar-primary-foreground" />
        </motion.div>

        <motion.span
          animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0 }}
          className="overflow-hidden whitespace-nowrap font-medium text-sidebar-foreground"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          Star Finder
        </motion.span>
      </div>

      {/* Hide toggle button when collapsed - user can click sidebar空白区域 to expand */}
      {isExpanded && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-8 shrink-0"
              onClick={toggleSidebar}
              size="icon"
              variant="ghost"
            >
              {isExpanded ? (
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                </svg>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
