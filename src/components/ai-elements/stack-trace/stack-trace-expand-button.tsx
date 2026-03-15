"use client";

import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useStackTrace } from "./context";
import type { StackTraceExpandButtonProps } from "./types";

export { type StackTraceExpandButtonProps };

export const StackTraceExpandButton = memo(({
  className,
  ...props
}: StackTraceExpandButtonProps) => {
  const { isOpen } = useStackTrace();

  return (
    <div
      className={cn("flex size-7 items-center justify-center", className)}
      {...props}
    >
      <ChevronDownIcon
        className={cn(
          "size-4 text-muted-foreground transition-transform",
          isOpen ? "rotate-180" : "rotate-0"
        )}
      />
    </div>
  );
});
