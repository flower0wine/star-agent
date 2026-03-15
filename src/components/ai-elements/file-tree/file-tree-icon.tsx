"use client";

import { cn } from "@/lib/utils";

export type FileTreeIconProps = React.HTMLAttributes<HTMLSpanElement>;

export function FileTreeIcon({
  className,
  children,
  ...props
}: FileTreeIconProps) {
  return (
    <span className={cn("shrink-0", className)} {...props}>
      {children}
    </span>
  );
}
