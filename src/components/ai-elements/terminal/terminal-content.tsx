import { cn } from "@/lib/utils";
import Ansi from "ansi-to-react";
import { useContext, useEffect, useRef } from "react";
import { TerminalContext } from "./context";
import type { HTMLAttributes } from "react";

export type TerminalContentProps = HTMLAttributes<HTMLDivElement>;

export function TerminalContent({
  className,
  children,
  ...props
}: TerminalContentProps) {
  const { output, isStreaming, autoScroll } = useContext(TerminalContext);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  return (
    <div
      className={cn(
        "max-h-96 overflow-auto p-4 font-mono text-sm leading-relaxed",
        className
      )}
      ref={containerRef}
      {...props}
    >
      {children ?? (
        <pre className="whitespace-pre-wrap break-words">
          <Ansi>{output}</Ansi>
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-zinc-100" />
          )}
        </pre>
      )}
    </div>
  );
}
