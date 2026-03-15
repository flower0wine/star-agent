"use client";

import { cn, createContext, useContext, useMemo, TestContext, statusStyles, statusIcons } from "./types";
import type { TestNameProps, TestDurationProps, TestStatusProps, TestProps } from "./types";

export function TestName({ className, children, ...props }: TestNameProps) {
  const { name } = useContext(TestContext);

  return (
    <span className={cn("flex-1", className)} {...props}>
      {children ?? name}
    </span>
  );
}

export function TestDuration({
  className,
  children,
  ...props
}: TestDurationProps) {
  const { duration } = useContext(TestContext);

  if (duration === undefined) {
    return null;
  }

  return (
    <span
      className={cn("ml-auto text-muted-foreground text-xs", className)}
      {...props}
    >
      {children ?? `${duration}ms`}
    </span>
  );
}

export function TestStatus({
  className,
  children,
  ...props
}: TestStatusProps) {
  const { status } = useContext(TestContext);

  return (
    <span
      className={cn("shrink-0", statusStyles[status], className)}
      {...props}
    >
      {children ?? statusIcons[status]}
    </span>
  );
}

export function Test({
  name,
  status,
  duration,
  className,
  children,
  ...props
}: TestProps) {
  const contextValue = useMemo(
    () => ({ duration, name, status }),
    [duration, name, status]
  );

  return (
    <TestContext.Provider value={contextValue}>
      <div
        className={cn("flex items-center gap-2 px-4 py-2 text-sm", className)}
        {...props}
      >
        {children ?? (
          <>
            <TestStatus />
            <TestName />
            {duration !== undefined && <TestDuration />}
          </>
        )}
      </div>
    </TestContext.Provider>
  );
}
