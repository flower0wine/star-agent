"use client";

import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { PromptInputFooterProps } from "../types";

export function PromptInputFooter({
  className,
  ...props
}: PromptInputFooterProps) {
  return (
    <InputGroupAddon
      align="block-end"
      className={cn("justify-between gap-1", className)}
      {...props}
    />
  );
}
