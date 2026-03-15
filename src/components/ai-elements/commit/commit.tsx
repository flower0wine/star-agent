"use client";

import { Collapsible } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type CommitProps = ComponentProps<typeof Collapsible>;

export function Commit({ className, children, ...props }: CommitProps) {
  return (
    <Collapsible
      className={cn("rounded-lg border bg-background", className)}
      {...props}
    >
      {children}
    </Collapsible>
  );
}
