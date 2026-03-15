import { cn } from "@/lib/utils";
import { TerminalIcon } from "lucide-react";
import type { HTMLAttributes } from "react";

export type TerminalTitleProps = HTMLAttributes<HTMLDivElement>;

export function TerminalTitle({
  className,
  children,
  ...props
}: TerminalTitleProps) {
  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-zinc-400", className)}
      {...props}
    >
      <TerminalIcon className="size-4" />
      {children ?? "Terminal"}
    </div>
  );
}
