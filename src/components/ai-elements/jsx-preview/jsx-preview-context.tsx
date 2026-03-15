"use client";

import { createContext, useContext } from "react";
import type { TProps as JsxParserProps } from "react-jsx-parser";

export interface JSXPreviewContextValue {
  jsx: string;
  processedJsx: string;
  isStreaming: boolean;
  error: Error | null;
  setError: (error: Error | null) => void;
  setLastGoodJsx: (jsx: string) => void;
  components: JsxParserProps["components"];
  bindings: JsxParserProps["bindings"];
  onErrorProp?: (error: Error) => void;
}

export const JSXPreviewContext = createContext<JSXPreviewContextValue | null>(
  null
);

export function useJSXPreview() {
  const context = useContext(JSXPreviewContext);
  if (!context) {
    throw new Error("JSXPreview components must be used within JSXPreview");
  }
  return context;
}
