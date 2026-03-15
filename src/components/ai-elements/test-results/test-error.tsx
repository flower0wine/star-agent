"use client";

import { cn } from "./types";
import type { TestErrorProps, TestErrorMessageProps, TestErrorStackProps } from "./types";

export function TestError({
  className,
  children,
  ...props
}: TestErrorProps) {
  return (
    <div
      className={cn(
        "mt-2 rounded-md bg-red-50 p-3 dark:bg-red-900/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TestErrorMessage({
  className,
  children,
  ...props
}: TestErrorMessageProps) {
  return (
    <p
      className={cn(
        "font-medium text-red-700 text-sm dark:text-red-400",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function TestErrorStack({
  className,
  children,
  ...props
}: TestErrorStackProps) {
  return (
    <pre
      className={cn(
        "mt-2 overflow-auto font-mono text-red-600 text-xs dark:text-red-400",
        className
      )}
      {...props}
    >
      {children}
    </pre>
  );
}
