"use client";

import { AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { useStackTrace } from "./context";
import type {
  StackTraceErrorProps,
  StackTraceErrorTypeProps,
  StackTraceErrorMessageProps,
} from "./types";

export { type StackTraceErrorMessageProps, type StackTraceErrorProps, type StackTraceErrorTypeProps };

export const StackTraceError = memo(({
  className,
  children,
  ...props
}: StackTraceErrorProps) => {
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-2 overflow-hidden",
        className
      )}
      {...props}
    >
      <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
      {children}
    </div>
  );
});

export const StackTraceErrorType = memo(({
  className,
  children,
  ...props
}: StackTraceErrorTypeProps) => {
  const { trace } = useStackTrace();

  return (
    <span
      className={cn("shrink-0 font-semibold text-destructive", className)}
      {...props}
    >
      {children ?? trace.errorType}
    </span>
  );
});

export const StackTraceErrorMessage = memo(({
  className,
  children,
  ...props
}: StackTraceErrorMessageProps) => {
  const { trace } = useStackTrace();

  return (
    <span className={cn("truncate text-foreground", className)} {...props}>
      {children ?? trace.errorMessage}
    </span>
  );
});
