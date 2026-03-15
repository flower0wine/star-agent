"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";

export type CommitCopyButtonProps = ComponentProps<typeof Button> & {
  hash: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export function CommitCopyButton({
  hash,
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CommitCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<number>(0);

  const copyToClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied) {
        await navigator.clipboard.writeText(hash);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(setIsCopied, timeout, false);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [hash, onCopy, onError, timeout, isCopied]);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    []
  );

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("size-7 shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
}
