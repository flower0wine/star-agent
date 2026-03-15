"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitMessageProps = HTMLAttributes<HTMLSpanElement>;

export function CommitMessage({
  className,
  children,
  ...props
}: CommitMessageProps) {
  return (
    <span className={cn("font-medium text-sm", className)} {...props}>
      {children}
    </span>
  );
}
