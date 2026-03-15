"use client";

import { CommandInput } from "@/components/ui/command";

import type { MicSelectorInputProps } from "./types";

export function MicSelectorInput({ ...props }: MicSelectorInputProps) {
  return <CommandInput placeholder="Search microphones..." {...props} />;
}
