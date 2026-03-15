"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

import { useSchemaDisplayContext, SchemaDisplayContext } from "./context";
import { methodStyles } from "./types";
import type { HttpMethod } from "./types";

export type SchemaDisplayMethodProps = ComponentProps<typeof Badge>;

export function SchemaDisplayMethod({
  className,
  children,
  ...props
}: SchemaDisplayMethodProps) {
  const { method } = useSchemaDisplayContext(SchemaDisplayContext);

  return (
    <Badge
      className={cn("font-mono text-xs", methodStyles[method], className)}
      variant="secondary"
      {...props}
    >
      {children ?? method}
    </Badge>
  );
}
