"use client";

import { cn } from "@/lib/utils";
import { useContext } from "react";

import { EnvironmentVariableContext } from "./context";
import type { EnvironmentVariableNameProps } from "./types";

export function EnvironmentVariableName({
  className,
  children,
  ...props
}: EnvironmentVariableNameProps) {
  const { name } = useContext(EnvironmentVariableContext);

  return (
    <span className={cn("font-mono text-sm", className)} {...props}>
      {children ?? name}
    </span>
  );
}
