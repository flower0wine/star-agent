"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

import type { EnvironmentVariablesContentProps } from "./types";

export function EnvironmentVariablesContent({
  className,
  children,
  ...props
}: EnvironmentVariablesContentProps) {
  return (
    <div className={cn("divide-y", className)} {...props}>
      {children}
    </div>
  );
}
