"use client";

import { useContext } from "react";

import { Command } from "@/components/ui/command";
import { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { MicSelectorContext } from "./context";
import type { MicSelectorContentProps } from "./types";

export function MicSelectorContent({
  className,
  popoverOptions,
  ...props
}: MicSelectorContentProps) {
  const { width, onValueChange, value } = useContext(MicSelectorContext);

  return (
    <PopoverContent
      className={cn("p-0", className)}
      style={{ width }}
      {...popoverOptions}
    >
      <Command onValueChange={onValueChange} value={value} {...props} />
    </PopoverContent>
  );
}
