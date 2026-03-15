"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

import { useSchemaDisplayContext, SchemaDisplayContext } from "./context";

export type SchemaDisplayDescriptionProps
  = HTMLAttributes<HTMLParagraphElement>;

export function SchemaDisplayDescription({
  className,
  children,
  ...props
}: SchemaDisplayDescriptionProps) {
  const { description } = useSchemaDisplayContext(SchemaDisplayContext);

  return (
    <p
      className={cn(
        "border-b px-4 py-3 text-muted-foreground text-sm",
        className
      )}
      {...props}
    >
      {children ?? description}
    </p>
  );
}
