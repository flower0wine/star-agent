"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

// ============================================================================
// AttachmentHoverCard - Hover preview
// ============================================================================

export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>;

export function AttachmentHoverCard({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: AttachmentHoverCardProps) {
  return <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />;
}

export type AttachmentHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>;

export function AttachmentHoverCardTrigger(props: AttachmentHoverCardTriggerProps) {
  return <HoverCardTrigger {...props} />;
}

export type AttachmentHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>;

export function AttachmentHoverCardContent({
  align = "start",
  className,
  ...props
}: AttachmentHoverCardContentProps) {
  return (
    <HoverCardContent
      align={align}
      className={cn("w-auto p-2", className)}
      {...props}
    />
  );
}
