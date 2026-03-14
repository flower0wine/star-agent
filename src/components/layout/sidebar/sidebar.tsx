"use client";

import { useEffect, useRef } from "react";
import { useLayout } from "@/hooks/use-layout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarHeader } from "./sidebar-header";
import { SidebarConversations } from "./sidebar-conversations";
import { SidebarFooter } from "./sidebar-footer";
import { useConversationStore } from "@/stores/conversation-store";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Sidebar() {
  const { sidebarExpanded, setSidebarExpanded } = useLayout();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hydrate = useConversationStore((state) => state.hydrate);
  const isHydrated = useConversationStore((state) => state.isHydrated);

  // Hydrate conversations on mount
  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [hydrate, isHydrated]);

  // Handle click on sidebar blank area to expand
  const handleSidebarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle when sidebar is collapsed
    if (sidebarExpanded)
      return;

    const target = e.target as HTMLElement;

    // Check if clicked element is an interactive element (button, a, etc.)
    // closest() traverses UP the DOM tree, so we check if any ancestor is button/a
    const isInteractiveElement
      = target.tagName === "BUTTON"
        || target.tagName === "A"
        || target.closest("button") != null
        || target.closest("a") != null;

    // If clicking on interactive element, don't expand
    if (isInteractiveElement)
      return;

    // Check if clicking on conversation list area (ScrollArea contains conversations)
    // ScrollArea creates a div with role="region" and aria-label="scroll area"
    const isClickingOnScrollArea = target.closest("[role='region']") != null;

    // If clicking on conversation list, don't expand
    if (isClickingOnScrollArea)
      return;

    // Otherwise, clicking on blank area - expand sidebar
    setSidebarExpanded(true);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full w-full flex-col",
          !sidebarExpanded && "cursor-pointer"
        )}
        onClick={handleSidebarClick}
        ref={sidebarRef}
      >
        <SidebarHeader isExpanded={sidebarExpanded} />

        <ScrollArea className={cn("flex-1", sidebarExpanded ? "px-3" : "px-1")}>
          <SidebarConversations isExpanded={sidebarExpanded} />
        </ScrollArea>

        <SidebarFooter isExpanded={sidebarExpanded} />
      </div>
    </TooltipProvider>
  );
}
