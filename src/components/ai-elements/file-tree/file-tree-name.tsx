"use client";

import { cn } from "@/lib/utils";

export type FileTreeNameProps = React.HTMLAttributes<HTMLSpanElement>;

export function FileTreeName({
  className,
  children,
  ...props
}: FileTreeNameProps) {
  return (
    <span className={cn("truncate", className)} {...props}>
      {children}
    </span>
  );
}
