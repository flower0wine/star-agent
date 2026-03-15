"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type EnvironmentVariableRequiredProps = ComponentProps<typeof Badge>;

export function EnvironmentVariableRequired({
  className,
  children,
  ...props
}: EnvironmentVariableRequiredProps) {
  return (
    <Badge className={cn("text-xs", className)} variant="secondary" {...props}>
      {children ?? "Required"}
    </Badge>
  );
}
