"use client";

import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useStackTrace } from "./context";
import type { StackTraceActionsProps, StackTraceCopyButtonProps } from "./types";

export { type StackTraceActionsProps, type StackTraceCopyButtonProps };

const handleActionsClick = (e: React.MouseEvent) => e.stopPropagation();
function handleActionsKeyDown(e: React.KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.stopPropagation();
  }
}

export const StackTraceActions = memo(({
  className,
  children,
  ...props
}: StackTraceActionsProps) => {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-1", className)}
      onClick={handleActionsClick}
      onKeyDown={handleActionsKeyDown}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
});

export const StackTraceCopyButton = memo(({
  onCopy,
  onError,
  timeout = 2000,
  className,
  children,
  ...props
}: StackTraceCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);
  const { raw } = useStackTrace();

  const copyToClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(raw);
      setIsCopied(true);
      onCopy?.();
      timeoutRef.current = window.setTimeout(setIsCopied, timeout, false);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [raw, onCopy, onError, timeout]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("size-7", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
});
