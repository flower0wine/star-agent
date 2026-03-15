"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import type {
  PromptInputTabsListProps,
  PromptInputTabProps,
  PromptInputTabLabelProps,
  PromptInputTabBodyProps,
  PromptInputTabItemProps,
} from "./types";

export function PromptInputTabsList({
  className,
  ...props
}: PromptInputTabsListProps) {
  return <div className={cn(className)} {...props} />;
}

export function PromptInputTab({
  className,
  ...props
}: PromptInputTabProps) {
  return <div className={cn(className)} {...props} />;
}

export function PromptInputTabLabel({
  className,
  ...props
}: PromptInputTabLabelProps) {
  return (
    <h3
      className={cn(
        "mb-2 px-3 font-medium text-muted-foreground text-xs",
        className
      )}
      {...props}
    />
  );
}

export function PromptInputTabBody({
  className,
  ...props
}: PromptInputTabBodyProps) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function PromptInputTabItem({
  className,
  ...props
}: PromptInputTabItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent",
        className
      )}
      {...props}
    />
  );
}
