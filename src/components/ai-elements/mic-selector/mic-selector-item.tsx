"use client";

import { useCallback, useContext } from "react";

import { CommandItem } from "@/components/ui/command";

import { MicSelectorContext } from "./context";
import type { MicSelectorItemProps } from "./types";

export function MicSelectorItem(props: MicSelectorItemProps) {
  const { onValueChange, onOpenChange } = useContext(MicSelectorContext);

  const handleSelect = useCallback(
    (currentValue: string) => {
      onValueChange?.(currentValue);
      onOpenChange?.(false);
    },
    [onValueChange, onOpenChange]
  );

  return <CommandItem onSelect={handleSelect} {...props} />;
}
