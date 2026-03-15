import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type TerminalActionsProps = HTMLAttributes<HTMLDivElement>;

export function TerminalActions({
  className,
  children,
  ...props
}: TerminalActionsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      {children}
    </div>
  );
}
