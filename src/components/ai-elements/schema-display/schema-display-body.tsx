"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type SchemaDisplayBodyProps = HTMLAttributes<HTMLDivElement>;

export function SchemaDisplayBody({
  className,
  children,
  ...props
}: SchemaDisplayBodyProps) {
  return (
    <div className={cn("divide-y", className)} {...props}>
      {children}
    </div>
  );
}
