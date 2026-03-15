"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

import type { EnvironmentVariableGroupProps } from "./types";

export function EnvironmentVariableGroup({
  className,
  children,
  ...props
}: EnvironmentVariableGroupProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}
