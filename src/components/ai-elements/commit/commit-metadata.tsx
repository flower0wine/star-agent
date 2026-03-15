"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitMetadataProps = HTMLAttributes<HTMLDivElement>;

export function CommitMetadata({
  className,
  children,
  ...props
}: CommitMetadataProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CommitSeparatorProps = HTMLAttributes<HTMLSpanElement>;

export function CommitSeparator({
  className,
  children,
  ...props
}: CommitSeparatorProps) {
  return (
    <span className={className} {...props}>
      {children ?? "•"}
    </span>
  );
}
