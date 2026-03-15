"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type SchemaDisplayHeaderProps = HTMLAttributes<HTMLDivElement>;

export function SchemaDisplayHeader({
  className,
  children,
  ...props
}: SchemaDisplayHeaderProps) {
  return (
    <div
      className={cn("flex items-center gap-3 border-b px-4 py-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}
