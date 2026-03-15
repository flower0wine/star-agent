"use client";

import { CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type CommitContentProps = ComponentProps<typeof CollapsibleContent>;

export function CommitContent({
  className,
  children,
  ...props
}: CommitContentProps) {
  return (
    <CollapsibleContent className={cn("border-t p-3", className)} {...props}>
      {children}
    </CollapsibleContent>
  );
}
