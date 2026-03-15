"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  QueueListProps,
  QueueSectionContentProps,
  QueueSectionLabelProps,
  QueueSectionProps,
  QueueSectionTriggerProps,
} from "./types";

export function QueueList({
  children,
  className,
  ...props
}: QueueListProps) {
  return (
    <ScrollArea className={cn("mt-2 -mb-1", className)} {...props}>
      <div className="max-h-40 pr-4">
        <ul>{children}</ul>
      </div>
    </ScrollArea>
  );
}

// QueueSection - collapsible section container
export function QueueSection({
  className,
  defaultOpen = true,
  ...props
}: QueueSectionProps) {
  return <Collapsible className={cn(className)} defaultOpen={defaultOpen} {...props} />;
}

// QueueSectionTrigger - section header/trigger
export function QueueSectionTrigger({
  children,
  className,
  ...props
}: QueueSectionTriggerProps) {
  return (
    <CollapsibleTrigger asChild>
      <button
        className={cn(
          "group flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-left font-medium text-muted-foreground text-sm transition-colors hover:bg-muted",
          className
        )}
        type="button"
        {...props}
      >
        {children}
      </button>
    </CollapsibleTrigger>
  );
}

// QueueSectionLabel - label content with icon and count
export function QueueSectionLabel({
  count,
  label,
  icon,
  className,
  ...props
}: QueueSectionLabelProps) {
  return (
    <span className={cn("flex items-center gap-2", className)} {...props}>
      <ChevronDownIcon className="size-4 transition-transform group-data-[state=closed]:-rotate-90" />
      {icon}
      <span>
        {count} {label}
      </span>
    </span>
  );
}

// QueueSectionContent - collapsible content area
export function QueueSectionContent({
  className,
  ...props
}: QueueSectionContentProps) {
  return <CollapsibleContent className={cn(className)} {...props} />;
}
