import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type InlineCitationProps = ComponentProps<"span">;

export function InlineCitation({ className, ...props }: InlineCitationProps) {
  return (
    <span
      className={cn("group inline items-center gap-1", className)}
      {...props}
    />
  );
}

export type InlineCitationTextProps = ComponentProps<"span">;

export function InlineCitationText({
  className,
  ...props
}: InlineCitationTextProps) {
  return (
    <span
      className={cn("transition-colors group-hover:bg-accent", className)}
      {...props}
    />
  );
}
