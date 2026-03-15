"use client";

import { cn } from "@/lib/utils";
import type { QueueProps } from "./types";

export function Queue({ className, ...props }: QueueProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-background px-3 pt-2 pb-2 shadow-xs",
        className
      )}
      {...props}
    />
  );
}
