"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon } from "lucide-react";
import type { PromptInputActionMenuProps, PromptInputActionMenuContentProps, PromptInputActionMenuItemProps, PromptInputActionMenuTriggerProps } from "./types";
import { PromptInputButton } from "./ui/button";

export function PromptInputActionMenu(props: PromptInputActionMenuProps) {
  return <DropdownMenu {...props} />;
}

export function PromptInputActionMenuTrigger({
  className,
  children,
  ...props
}: PromptInputActionMenuTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <PromptInputButton className={className} {...props}>
        {children ?? <PlusIcon className="size-4" />}
      </PromptInputButton>
    </DropdownMenuTrigger>
  );
}

export function PromptInputActionMenuContent({
  className,
  ...props
}: PromptInputActionMenuContentProps) {
  return <DropdownMenuContent align="start" className={className} {...props} />;
}

export function PromptInputActionMenuItem({
  className,
  ...props
}: PromptInputActionMenuItemProps) {
  return <DropdownMenuItem className={className} {...props} />;
}
