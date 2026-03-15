import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { TerminalContext } from "./context";
import { TerminalHeader } from "./terminal-header";
import { TerminalTitle } from "./terminal-title";
import { TerminalStatus } from "./terminal-status";
import { TerminalActions } from "./terminal-actions";
import { TerminalCopyButton } from "./terminal-copy-button";
import { TerminalClearButton } from "./terminal-clear-button";
import { TerminalContent } from "./terminal-content";
import type { HTMLAttributes } from "react";

export type TerminalProps = HTMLAttributes<HTMLDivElement> & {
  output: string;
  isStreaming?: boolean;
  autoScroll?: boolean;
  onClear?: () => void;
};

export function Terminal({
  output,
  isStreaming = false,
  autoScroll = true,
  onClear,
  className,
  children,
  ...props
}: TerminalProps) {
  const contextValue = useMemo(
    () => ({ autoScroll, isStreaming, onClear, output }),
    [autoScroll, isStreaming, onClear, output]
  );

  return (
    <TerminalContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <TerminalHeader>
              <TerminalTitle />
              <div className="flex items-center gap-1">
                <TerminalStatus />
                <TerminalActions>
                  <TerminalCopyButton />
                  {onClear && <TerminalClearButton />}
                </TerminalActions>
              </div>
            </TerminalHeader>
            <TerminalContent />
          </>
        )}
      </div>
    </TerminalContext.Provider>
  );
}
