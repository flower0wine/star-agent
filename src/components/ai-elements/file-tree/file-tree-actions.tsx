"use client";

import { cn } from "@/lib/utils";

export type FileTreeActionsProps = React.HTMLAttributes<HTMLDivElement>;

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

export function FileTreeActions({
  className,
  children,
  ...props
}: FileTreeActionsProps) {
  return (
    <div
      className={cn("ml-auto flex items-center gap-1", className)}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}
