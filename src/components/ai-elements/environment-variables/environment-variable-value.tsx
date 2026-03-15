"use client";

import { cn } from "@/lib/utils";
import { useContext } from "react";

import {
  EnvironmentVariableContext,
  EnvironmentVariablesContext,
} from "./context";
import type { EnvironmentVariableValueProps } from "./types";

export function EnvironmentVariableValue({
  className,
  children,
  ...props
}: EnvironmentVariableValueProps) {
  const { value } = useContext(EnvironmentVariableContext);
  const { showValues } = useContext(EnvironmentVariablesContext);

  const displayValue = showValues
    ? value
    : "•".repeat(Math.min(value.length, 20));

  return (
    <span
      className={cn(
        "font-mono text-muted-foreground text-sm",
        !showValues && "select-none",
        className
      )}
      {...props}
    >
      {children ?? displayValue}
    </span>
  );
}
