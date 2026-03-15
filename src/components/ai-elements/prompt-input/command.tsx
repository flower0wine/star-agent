"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type {
  PromptInputCommandProps,
  PromptInputCommandInputProps,
  PromptInputCommandListProps,
  PromptInputCommandEmptyProps,
  PromptInputCommandGroupProps,
  PromptInputCommandItemProps,
  PromptInputCommandSeparatorProps,
} from "./types";

export function PromptInputCommand({
  className,
  ...props
}: PromptInputCommandProps) {
  return <Command className={cn(className)} {...props} />;
}

export function PromptInputCommandInput({
  className,
  ...props
}: PromptInputCommandInputProps) {
  return <CommandInput className={cn(className)} {...props} />;
}

export function PromptInputCommandList({
  className,
  ...props
}: PromptInputCommandListProps) {
  return <CommandList className={cn(className)} {...props} />;
}

export function PromptInputCommandEmpty({
  className,
  ...props
}: PromptInputCommandEmptyProps) {
  return <CommandEmpty className={cn(className)} {...props} />;
}

export function PromptInputCommandGroup({
  className,
  ...props
}: PromptInputCommandGroupProps) {
  return <CommandGroup className={cn(className)} {...props} />;
}

export function PromptInputCommandItem({
  className,
  ...props
}: PromptInputCommandItemProps) {
  return <CommandItem className={cn(className)} {...props} />;
}

export function PromptInputCommandSeparator({
  className,
  ...props
}: PromptInputCommandSeparatorProps) {
  return <CommandSeparator className={cn(className)} {...props} />;
}
