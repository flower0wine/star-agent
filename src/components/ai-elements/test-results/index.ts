// Test components
export { Test, TestDuration, TestName, TestStatus } from "./test";

// Test Error components
export { TestError, TestErrorMessage, TestErrorStack } from "./test-error";

// Test Results components
export {
  TestResults,
  TestResultsContent,
  TestResultsDuration,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummary,
} from "./test-results";

// Test Suite components
export {
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
  TestSuiteStats,
} from "./test-suite";

export type {
  TestResultsContentProps,
  TestResultsDurationProps,
  TestResultsHeaderProps,
  TestResultsProgressProps,
  TestResultsProps,
  TestResultsSummaryData,
  TestResultsSummaryProps,
} from "./types";

export type {
  TestSuiteContentProps,
  TestSuiteNameProps,
  TestSuiteProps,
  TestSuiteStatsProps,
} from "./types";

export type {
  TestDurationProps,
  TestNameProps,
  TestProps,
  TestStatusProps,
} from "./types";

export type {
  TestErrorMessageProps,
  TestErrorProps,
  TestErrorStackProps,
} from "./types";

// Shared exports
export {
  formatDuration,
  statusIcons,
  statusStyles,
  TestContext,
  TestResultsContext,
  TestStatusIcon,
  TestSuiteContext,
} from "./types";

export type {
  TestContextType,
  TestResultsContextType,
  TestStatusType,
  TestSuiteContextType,
} from "./types";
