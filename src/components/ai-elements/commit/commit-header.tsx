"use client";

import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type CommitHeaderProps = ComponentProps<typeof CollapsibleTrigger>;

export function CommitHeader({
  className,
  children,
  ...props
}: CommitHeaderProps) {
  return (
    <CollapsibleTrigger asChild {...props}>
      <div
        className={cn(
          "group flex cursor-pointer items-center justify-between gap-4 p-3 text-left transition-colors hover:opacity-80",
          className
        )}
      >
        {children}
      </div>
    </CollapsibleTrigger>
  );
}
