"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

import type {
  VoiceSelectorDialogProps,
  VoiceSelectorEmptyProps,
  VoiceSelectorGroupProps,
  VoiceSelectorInputProps,
  VoiceSelectorItemProps,
  VoiceSelectorListProps,
  VoiceSelectorSeparatorProps,
  VoiceSelectorShortcutProps,
} from "./types";

export function VoiceSelectorDialog(props: VoiceSelectorDialogProps) {
  return <CommandDialog {...props} />;
}

export function VoiceSelectorInput({
  className,
  ...props
}: VoiceSelectorInputProps) {
  return <CommandInput className={cn("h-auto py-3.5", className)} {...props} />;
}

export function VoiceSelectorList(props: VoiceSelectorListProps) {
  return <CommandList {...props} />;
}

export function VoiceSelectorEmpty(props: VoiceSelectorEmptyProps) {
  return <CommandEmpty {...props} />;
}

export function VoiceSelectorGroup(props: VoiceSelectorGroupProps) {
  return <CommandGroup {...props} />;
}

export function VoiceSelectorItem({
  className,
  ...props
}: VoiceSelectorItemProps) {
  return <CommandItem className={cn("px-4 py-2", className)} {...props} />;
}

export function VoiceSelectorShortcut(props: VoiceSelectorShortcutProps) {
  return <CommandShortcut {...props} />;
}

export function VoiceSelectorSeparator(props: VoiceSelectorSeparatorProps) {
  return <CommandSeparator {...props} />;
}
