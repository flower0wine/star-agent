"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const fileStatusStyles = {
  added: "text-green-600 dark:text-green-400",
  deleted: "text-red-600 dark:text-red-400",
  modified: "text-yellow-600 dark:text-yellow-400",
  renamed: "text-blue-600 dark:text-blue-400",
};

const fileStatusLabels = {
  added: "A",
  deleted: "D",
  modified: "M",
  renamed: "R",
};

export type CommitFileStatusProps = HTMLAttributes<HTMLSpanElement> & {
  status: "added" | "modified" | "deleted" | "renamed";
};

export function CommitFileStatus({
  status,
  className,
  children,
  ...props
}: CommitFileStatusProps) {
  return (
    <span
      className={cn(
        "font-medium font-mono text-xs",
        fileStatusStyles[status],
        className
      )}
      {...props}
    >
      {children ?? fileStatusLabels[status]}
    </span>
  );
}
