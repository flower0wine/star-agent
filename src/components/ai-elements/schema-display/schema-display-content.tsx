"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type SchemaDisplayContentProps = HTMLAttributes<HTMLDivElement>;

export function SchemaDisplayContent({
  className,
  children,
  ...props
}: SchemaDisplayContentProps) {
  return (
    <div className={cn("divide-y", className)} {...props}>
      {children}
    </div>
  );
}
