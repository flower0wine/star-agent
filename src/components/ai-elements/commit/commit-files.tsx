"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitFilesProps = HTMLAttributes<HTMLDivElement>;

export function CommitFiles({
  className,
  children,
  ...props
}: CommitFilesProps) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      {children}
    </div>
  );
}
