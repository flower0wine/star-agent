"use client";

import {
  HoverCardContent,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type ContextContentProps = ComponentProps<typeof HoverCardContent>;

export function ContextContent({
  className,
  ...props
}: ContextContentProps) {
  return (
    <HoverCardContent
      className={cn("min-w-60 divide-y overflow-hidden p-0", className)}
      {...props}
    />
  );
}
