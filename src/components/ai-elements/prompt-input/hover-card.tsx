"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type {
  PromptInputHoverCardProps,
  PromptInputHoverCardTriggerProps,
  PromptInputHoverCardContentProps,
} from "./types";

export function PromptInputHoverCard({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: PromptInputHoverCardProps) {
  return <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />;
}

export function PromptInputHoverCardTrigger(props: PromptInputHoverCardTriggerProps) {
  return <HoverCardTrigger {...props} />;
}

export function PromptInputHoverCardContent({
  align = "start",
  ...props
}: PromptInputHoverCardContentProps) {
  return <HoverCardContent align={align} {...props} />;
}
