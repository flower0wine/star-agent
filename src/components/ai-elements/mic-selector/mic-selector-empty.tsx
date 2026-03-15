"use client";

import { CommandEmpty } from "@/components/ui/command";

import type { MicSelectorEmptyProps } from "./types";

export function MicSelectorEmpty({
  children = "No microphone found.",
  ...props
}: MicSelectorEmptyProps) {
  return <CommandEmpty {...props}>{children}</CommandEmpty>;
}
