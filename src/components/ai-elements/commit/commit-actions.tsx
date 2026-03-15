"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitActionsProps = HTMLAttributes<HTMLDivElement>;

const handleActionsClick = (e: React.MouseEvent) => e.stopPropagation();
const handleActionsKeyDown = (e: React.KeyboardEvent) => e.stopPropagation();

export function CommitActions({
  className,
  children,
  ...props
}: CommitActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      onClick={handleActionsClick}
      onKeyDown={handleActionsKeyDown}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}
