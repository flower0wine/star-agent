"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type WebPreviewNavigationProps = ComponentProps<"div">;

export function WebPreviewNavigation({
  className,
  children,
  ...props
}: WebPreviewNavigationProps) {
  return (
    <div
      className={cn("flex items-center gap-1 border-b p-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}
