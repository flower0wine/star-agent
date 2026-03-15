"use client";

import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useStackTrace } from "./context";
import type { StackTraceHeaderProps } from "./types";

export { type StackTraceHeaderProps };

export const StackTraceHeader = memo(({
  className,
  children,
  ...props
}: StackTraceHeaderProps) => {
  const { isOpen, setIsOpen } = useStackTrace();

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen}>
      <CollapsibleTrigger asChild>
        <div
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </CollapsibleTrigger>
    </Collapsible>
  );
});
