import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type TerminalHeaderProps = HTMLAttributes<HTMLDivElement>;

export function TerminalHeader({
  className,
  children,
  ...props
}: TerminalHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-zinc-800 border-b px-4 py-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
