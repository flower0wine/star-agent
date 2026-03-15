"use client";

import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type OpenInContentProps = ComponentProps<typeof DropdownMenuContent>;

export function OpenInContent({ className, ...props }: OpenInContentProps) {
  return (
    <DropdownMenuContent
      align="start"
      className={cn("w-[240px]", className)}
      {...props}
    />
  );
}
