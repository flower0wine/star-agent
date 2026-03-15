"use client";

import { createContext, useContext } from "react";
import type { ParsedStackTrace } from "./types";

export interface StackTraceContextValue {
  trace: ParsedStackTrace;
  raw: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onFilePathClick?: (filePath: string, line?: number, column?: number) => void;
}

export const StackTraceContext = createContext<StackTraceContextValue | null>(
  null
);

export function useStackTrace() {
  const context = useContext(StackTraceContext);
  if (!context) {
    throw new Error("StackTrace components must be used within StackTrace");
  }
  return context;
}
