"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitInfoProps = HTMLAttributes<HTMLDivElement>;

export function CommitInfo({
  className,
  children,
  ...props
}: CommitInfoProps) {
  return (
    <div className={cn("flex flex-1 flex-col", className)} {...props}>
      {children}
    </div>
  );
}
