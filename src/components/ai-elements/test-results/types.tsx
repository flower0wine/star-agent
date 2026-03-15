"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  CircleDotIcon,
  CircleIcon,
  XCircleIcon,
} from "lucide-react";
import React, { createContext, useContext, useMemo } from "react";
import type { HTMLAttributes } from "react";


export type TestStatusType = "passed" | "failed" | "skipped" | "running";

export interface TestResultsSummaryData {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration?: number;
}

export interface TestResultsContextType {
  summary?: TestResultsSummaryData;
}

export const TestResultsContext = createContext<TestResultsContextType>({});

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export type TestResultsHeaderProps = HTMLAttributes<HTMLDivElement>;

export type TestResultsDurationProps = HTMLAttributes<HTMLSpanElement>;

export type TestResultsSummaryProps = HTMLAttributes<HTMLDivElement>;

export type TestResultsProps = HTMLAttributes<HTMLDivElement> & {
  summary?: TestResultsSummaryData;
};

export type TestResultsProgressProps = HTMLAttributes<HTMLDivElement>;

export type TestResultsContentProps = HTMLAttributes<HTMLDivElement>;

export interface TestSuiteContextType {
  name: string;
  status: TestStatusType;
}

export const TestSuiteContext = createContext<TestSuiteContextType>({
  name: "",
  status: "passed",
});

export const statusStyles: Record<TestStatusType, string> = {
  failed: "text-red-600 dark:text-red-400",
  passed: "text-green-600 dark:text-green-400",
  running: "text-blue-600 dark:text-blue-400",
  skipped: "text-yellow-600 dark:text-yellow-400",
};

export const statusIcons: Record<TestStatusType, React.ReactNode> = {
  failed: <XCircleIcon className="size-4" />,
  passed: <CheckCircle2Icon className="size-4" />,
  running: <CircleDotIcon className="size-4 animate-pulse" />,
  skipped: <CircleIcon className="size-4" />,
};

export function TestStatusIcon({ status }: { status: TestStatusType }) {
  return (
    <span className={cn("shrink-0", statusStyles[status])}>
      {statusIcons[status]}
    </span>
  );
}

export type TestSuiteProps = React.ComponentProps<typeof import("radix-ui").Collapsible.Root> & {
  name: string;
  status: TestStatusType;
};

export type TestSuiteNameProps = React.ComponentProps<typeof import("radix-ui").Collapsible.CollapsibleTrigger>;

export type TestSuiteStatsProps = HTMLAttributes<HTMLDivElement> & {
  passed?: number;
  failed?: number;
  skipped?: number;
};

export type TestSuiteContentProps = React.ComponentProps<typeof import("radix-ui").Collapsible.CollapsibleContent>;

export interface TestContextType {
  name: string;
  status: TestStatusType;
  duration?: number;
}

export const TestContext = createContext<TestContextType>({
  name: "",
  status: "passed",
});

export type TestNameProps = HTMLAttributes<HTMLSpanElement>;

export type TestDurationProps = HTMLAttributes<HTMLSpanElement>;

export type TestStatusProps = HTMLAttributes<HTMLSpanElement>;

export type TestProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  status: TestStatusType;
  duration?: number;
};

export type TestErrorProps = HTMLAttributes<HTMLDivElement>;

export type TestErrorMessageProps = HTMLAttributes<HTMLParagraphElement>;

export type TestErrorStackProps = HTMLAttributes<HTMLPreElement>;

export { cn, createContext, useContext, useMemo };
