import type { ComponentProps } from "react";

// Regex patterns for parsing stack traces
export const STACK_FRAME_WITH_PARENS_REGEX = /^at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/;
export const STACK_FRAME_WITHOUT_FN_REGEX = /^at\s+(.+):(\d+):(\d+)$/;
export const ERROR_TYPE_REGEX = /^(\w+Error|Error):\s*(.*)$/;
export const AT_PREFIX_REGEX = /^at\s+/;

export interface StackFrame {
  raw: string;
  functionName: string | null;
  filePath: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  isInternal: boolean;
}

export interface ParsedStackTrace {
  errorType: string | null;
  errorMessage: string;
  frames: StackFrame[];
  raw: string;
}

// Component Props types
export type StackTraceProps = ComponentProps<"div"> & {
  trace: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onFilePathClick?: (filePath: string, lineNumber?: number, columnNumber?: number) => void;
};

export type StackTraceHeaderProps = ComponentProps<"div">;

export type StackTraceErrorProps = ComponentProps<"div">;

export type StackTraceErrorTypeProps = ComponentProps<"span">;

export type StackTraceErrorMessageProps = ComponentProps<"span">;

export type StackTraceActionsProps = ComponentProps<"div">;

export type StackTraceCopyButtonProps = ComponentProps<"button"> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export type StackTraceExpandButtonProps = ComponentProps<"div">;

export type StackTraceContentProps = ComponentProps<"div"> & {
  maxHeight?: number;
};

export type StackTraceFramesProps = ComponentProps<"div"> & {
  showInternalFrames?: boolean;
};
