"use client";

import { GitCommitIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitHashProps = HTMLAttributes<HTMLSpanElement>;

export function CommitHash({
  className,
  children,
  ...props
}: CommitHashProps) {
  return (
    <span className={cn("font-mono text-xs", className)} {...props}>
      <GitCommitIcon className="mr-1 inline-block size-3" />
      {children}
    </span>
  );
}
