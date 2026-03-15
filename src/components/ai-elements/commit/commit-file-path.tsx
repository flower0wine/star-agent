"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitFilePathProps = HTMLAttributes<HTMLSpanElement>;

export function CommitFilePath({
  className,
  children,
  ...props
}: CommitFilePathProps) {
  return (
    <span className={cn("truncate font-mono text-xs", className)} {...props}>
      {children}
    </span>
  );
}
