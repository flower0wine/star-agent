"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  PromptInputSelectProps,
  PromptInputSelectTriggerProps,
  PromptInputSelectContentProps,
  PromptInputSelectItemProps,
  PromptInputSelectValueProps,
} from "./types";

export function PromptInputSelect(props: PromptInputSelectProps) {
  return <Select {...props} />;
}

export function PromptInputSelectTrigger({
  className,
  ...props
}: PromptInputSelectTriggerProps) {
  return (
    <SelectTrigger
      className={className}
      {...props}
    />
  );
}

export function PromptInputSelectContent({
  className,
  ...props
}: PromptInputSelectContentProps) {
  return <SelectContent className={className} {...props} />;
}

export function PromptInputSelectItem({
  className,
  ...props
}: PromptInputSelectItemProps) {
  return <SelectItem className={className} {...props} />;
}

export function PromptInputSelectValue({
  className,
  ...props
}: PromptInputSelectValueProps) {
  return <SelectValue className={className} {...props} />;
}
