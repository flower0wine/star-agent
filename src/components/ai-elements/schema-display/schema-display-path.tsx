"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

import { useSchemaDisplayContext, SchemaDisplayContext } from "./context";
import { PATH_PARAM_REGEX } from "./types";

export type SchemaDisplayPathProps = HTMLAttributes<HTMLSpanElement>;

export function SchemaDisplayPath({
  className,
  children,
  ...props
}: SchemaDisplayPathProps) {
  const { path } = useSchemaDisplayContext(SchemaDisplayContext);

  // Highlight path parameters
  const highlightedPath = path.replaceAll(
    PATH_PARAM_REGEX,
    "<span class=\"text-blue-600 dark:text-blue-400\">{$1}</span>"
  );

  return (
    <span
      className={cn("font-mono text-sm", className)}
      // oxlint-disable-next-line eslint-plugin-react(no-danger)
      dangerouslySetInnerHTML={{ __html: String(children ?? highlightedPath) }}
      {...props}
    />
  );
}
