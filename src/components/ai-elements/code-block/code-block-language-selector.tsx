import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type CodeBlockLanguageSelectorProps = ComponentProps<typeof Select>;

export function CodeBlockLanguageSelector(props: CodeBlockLanguageSelectorProps) {
  return <Select {...props} />;
}

export type CodeBlockLanguageSelectorTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export function CodeBlockLanguageSelectorTrigger({
  className,
  ...props
}: CodeBlockLanguageSelectorTriggerProps) {
  return (
    <SelectTrigger
      className={cn(
        "h-7 border-none bg-transparent px-2 text-xs shadow-none",
        className
      )}
      size="sm"
      {...props}
    />
  );
}

export type CodeBlockLanguageSelectorValueProps = ComponentProps<
  typeof SelectValue
>;

export function CodeBlockLanguageSelectorValue(
  props: CodeBlockLanguageSelectorValueProps
) {
  return <SelectValue {...props} />;
}

export type CodeBlockLanguageSelectorContentProps = ComponentProps<
  typeof SelectContent
>;

export function CodeBlockLanguageSelectorContent({
  align = "end",
  ...props
}: CodeBlockLanguageSelectorContentProps) {
  return <SelectContent align={align} {...props} />;
}

export type CodeBlockLanguageSelectorItemProps = ComponentProps<
  typeof SelectItem
>;

export function CodeBlockLanguageSelectorItem(
  props: CodeBlockLanguageSelectorItemProps
) {
  return <SelectItem {...props} />;
}
