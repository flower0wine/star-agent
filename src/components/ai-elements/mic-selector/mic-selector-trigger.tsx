"use client";

import { useCallback, useContext, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDownIcon } from "lucide-react";

import { MicSelectorContext } from "./context";
import type { MicSelectorTriggerProps } from "./types";

export function MicSelectorTrigger({
  children,
  ...props
}: MicSelectorTriggerProps) {
  const { setWidth } = useContext(MicSelectorContext);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Create a ResizeObserver to detect width changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = (entry.target as HTMLElement).offsetWidth;
        if (newWidth) {
          setWidth?.(newWidth);
        }
      }
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    // Clean up the observer when component unmounts
    return () => {
      resizeObserver.disconnect();
    };
  }, [setWidth]);

  return (
    <PopoverTrigger asChild>
      <Button variant="outline" {...props} ref={ref}>
        {children}
        <ChevronsUpDownIcon
          className="shrink-0 text-muted-foreground"
          size={16}
        />
      </Button>
    </PopoverTrigger>
  );
}
