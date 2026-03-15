"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type SchemaDisplayExampleProps = HTMLAttributes<HTMLPreElement>;

export function SchemaDisplayExample({
  className,
  children,
  ...props
}: SchemaDisplayExampleProps) {
  return (
    <pre
      className={cn(
        "mx-4 mb-4 overflow-auto rounded-md bg-muted p-4 font-mono text-sm",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  );
}
