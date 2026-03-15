"use client";

export { useStackTrace } from "./context";
export { StackTrace } from "./stack-trace";
export { StackTraceActions, StackTraceCopyButton } from "./stack-trace-actions";
export { StackTraceContent } from "./stack-trace-content";
export { StackTraceError, StackTraceErrorMessage, StackTraceErrorType } from "./stack-trace-error";
export { StackTraceExpandButton } from "./stack-trace-expand-button";
export { StackTraceFrames } from "./stack-trace-frames";
export { StackTraceHeader } from "./stack-trace-header";

export type {
  StackTraceActionsProps,
  StackTraceContentProps,
  StackTraceCopyButtonProps,
  StackTraceErrorMessageProps,
  StackTraceErrorProps,
  StackTraceErrorTypeProps,
  StackTraceExpandButtonProps,
  StackTraceFramesProps,
  StackTraceHeaderProps,
  StackTraceProps,
} from "./types";

export type { ParsedStackTrace, StackFrame } from "./types";

export { parseStackFrame, parseStackTrace } from "./utils";
