import { cn } from "@/lib/utils";
import { useContext } from "react";
import { TerminalContext } from "./context";
import type { HTMLAttributes } from "react";

export type TerminalStatusProps = HTMLAttributes<HTMLDivElement>;

export function TerminalStatus({
  className,
  children,
  ...props
}: TerminalStatusProps) {
  const { isStreaming } = useContext(TerminalContext);

  if (!isStreaming) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center gap-2 text-xs text-zinc-400", className)}
      {...props}
    >
      {children}
    </div>
  );
}
