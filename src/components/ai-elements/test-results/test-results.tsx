"use client";

import { Badge } from "@/components/ui/badge";
import { cn, createContext, useContext, useMemo, TestResultsContext, formatDuration } from "./types";
import type { TestResultsHeaderProps, TestResultsDurationProps, TestResultsSummaryProps, TestResultsProps, TestResultsProgressProps, TestResultsContentProps, TestResultsSummaryData } from "./types";
import { CheckCircle2Icon, CircleIcon, XCircleIcon } from "lucide-react";

export function TestResultsHeader({
  className,
  children,
  ...props
}: TestResultsHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function TestResultsDuration({
  className,
  children,
  ...props
}: TestResultsDurationProps) {
  const { summary } = useContext(TestResultsContext);

  if (!summary?.duration) {
    return null;
  }

  return (
    <span className={cn("text-muted-foreground text-sm", className)} {...props}>
      {children ?? formatDuration(summary.duration)}
    </span>
  );
}

export function TestResultsSummary({
  className,
  children,
  ...props
}: TestResultsSummaryProps) {
  const { summary } = useContext(TestResultsContext);

  if (!summary) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {children ?? (
        <>
          <Badge
            className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            variant="secondary"
          >
            <CheckCircle2Icon className="size-3" />
            {summary.passed} passed
          </Badge>
          {summary.failed > 0 && (
            <Badge
              className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              variant="secondary"
            >
              <XCircleIcon className="size-3" />
              {summary.failed} failed
            </Badge>
          )}
          {summary.skipped > 0 && (
            <Badge
              className="gap-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              variant="secondary"
            >
              <CircleIcon className="size-3" />
              {summary.skipped} skipped
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

export function TestResults({
  summary,
  className,
  children,
  ...props
}: TestResultsProps) {
  const contextValue = useMemo(() => ({ summary }), [summary]);

  return (
    <TestResultsContext.Provider value={contextValue}>
      <div
        className={cn("rounded-lg border bg-background", className)}
        {...props}
      >
        {children
          ?? (summary && (
            <TestResultsHeader>
              <TestResultsSummary />
              <TestResultsDuration />
            </TestResultsHeader>
          ))}
      </div>
    </TestResultsContext.Provider>
  );
}

export function TestResultsProgress({
  className,
  children,
  ...props
}: TestResultsProgressProps) {
  const { summary } = useContext(TestResultsContext);

  if (!summary) {
    return null;
  }

  const passedPercent = (summary.passed / summary.total) * 100;
  const failedPercent = (summary.failed / summary.total) * 100;

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children ?? (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${passedPercent}%` }}
            />
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${failedPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>
              {summary.passed}/{summary.total} tests passed
            </span>
            <span>{passedPercent.toFixed(0)}%</span>
          </div>
        </>
      )}
    </div>
  );
}

export function TestResultsContent({
  className,
  children,
  ...props
}: TestResultsContentProps) {
  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      {children}
    </div>
  );
}
