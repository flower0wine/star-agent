"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type EnvironmentVariablesHeaderProps = HTMLAttributes<HTMLDivElement>;

export function EnvironmentVariablesHeader({
  className,
  children,
  ...props
}: EnvironmentVariablesHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type EnvironmentVariablesTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function EnvironmentVariablesTitle({
  className,
  children,
  ...props
}: EnvironmentVariablesTitleProps) {
  return (
    <h3 className={cn("font-medium text-sm", className)} {...props}>
      {children ?? "Environment Variables"}
    </h3>
  );
}
