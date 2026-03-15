import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type InlineCitationQuoteProps = ComponentProps<"blockquote">;

export function InlineCitationQuote({
  children,
  className,
  ...props
}: InlineCitationQuoteProps) {
  return (
    <blockquote
      className={cn(
        "border-muted border-l-2 pl-3 text-muted-foreground text-sm italic",
        className
      )}
      {...props}
    >
      {children}
    </blockquote>
  );
}
