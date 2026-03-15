"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

import type { SchemaParameter } from "./types";

export type SchemaDisplayParameterProps = HTMLAttributes<HTMLDivElement>
  & SchemaParameter;

export function SchemaDisplayParameter({
  name,
  type,
  required,
  description,
  location,
  className,
  ...props
}: SchemaDisplayParameterProps) {
  return (
    <div className={cn("px-4 py-3 pl-10", className)} {...props}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{name}</span>
        <Badge className="text-xs" variant="outline">
          {type}
        </Badge>
        {location && (
          <Badge className="text-xs" variant="secondary">
            {location}
          </Badge>
        )}
        {required && (
          <Badge
            className="bg-red-100 text-red-700 text-xs dark:bg-red-900/30 dark:text-red-400"
            variant="secondary"
          >
            required
          </Badge>
        )}
      </div>
      {description && (
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      )}
    </div>
  );
}
