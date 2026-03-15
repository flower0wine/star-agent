"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitFileProps = HTMLAttributes<HTMLDivElement>;

export function CommitFile({
  className,
  children,
  ...props
}: CommitFileProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CommitFileInfoProps = HTMLAttributes<HTMLDivElement>;

export function CommitFileInfo({
  className,
  children,
  ...props
}: CommitFileInfoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}
