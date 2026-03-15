"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import type { PromptInputToolsProps } from "../types";

export function PromptInputTools({
  className,
  ...props
}: PromptInputToolsProps) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-1", className)}
      {...props}
    />
  );
}
