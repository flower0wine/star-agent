"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type ContextContentBodyProps = ComponentProps<"div">;

export function ContextContentBody({
  children,
  className,
  ...props
}: ContextContentBodyProps) {
  return (
    <div className={cn("w-full p-3", className)} {...props}>
      {children}
    </div>
  );
}
