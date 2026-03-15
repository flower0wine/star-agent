"use client";

import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { PromptInputHeaderProps } from "../types";

export function PromptInputHeader({
  className,
  ...props
}: PromptInputHeaderProps) {
  return (
    <InputGroupAddon
      align="block-end"
      className={cn("order-first flex-wrap gap-1", className)}
      {...props}
    />
  );
}
