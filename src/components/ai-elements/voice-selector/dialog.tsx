"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Command } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

import type {
  VoiceSelectorContentProps,
  VoiceSelectorTriggerProps,
} from "./types";

export function VoiceSelectorTrigger(props: VoiceSelectorTriggerProps) {
  return <DialogTrigger {...props} />;
}

export function VoiceSelectorContent({
  className,
  children,
  title = "Voice Selector",
  ...props
}: VoiceSelectorContentProps) {
  return (
    <DialogContent
      aria-describedby={undefined}
      className={cn("p-0", className)}
      {...props}
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <Command className="**:data-[slot=command-input-wrapper]:h-auto">
        {children}
      </Command>
    </DialogContent>
  );
}
