"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import type { PromptInputBodyProps } from "../types";

export function PromptInputBody({
  className,
  ...props
}: PromptInputBodyProps) {
  return <div className={cn("contents", className)} {...props} />;
}
