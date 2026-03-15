"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { memo, useMemo, useState } from "react";
import type { TProps as JsxParserProps } from "react-jsx-parser";
import {
  JSXPreviewContext,
} from "./jsx-preview-context";
import { completeJsxTag } from "./jsx-preview-utils";

export type JSXPreviewProps = ComponentProps<"div"> & {
  jsx: string;
  isStreaming?: boolean;
  components?: JsxParserProps["components"];
  bindings?: JsxParserProps["bindings"];
  onError?: (error: Error) => void;
};

export const JSXPreview = memo(
  ({
    jsx,
    isStreaming = false,
    components,
    bindings,
    onError,
    className,
    children,
    ...props
  }: JSXPreviewProps) => {
    const [prevJsx, setPrevJsx] = useState(jsx);
    const [error, setError] = useState<Error | null>(null);
    const [_lastGoodJsx, setLastGoodJsx] = useState("");

    // Clear error when jsx changes (derived state pattern)
    if (jsx !== prevJsx) {
      setPrevJsx(jsx);
      setError(null);
    }

    const processedJsx = useMemo(
      () => (isStreaming ? completeJsxTag(jsx) : jsx),
      [jsx, isStreaming]
    );

    const contextValue = useMemo(
      () => ({
        bindings,
        components,
        error,
        isStreaming,
        jsx,
        onErrorProp: onError,
        processedJsx,
        setError,
        setLastGoodJsx,
      }),
      [
        bindings,
        components,
        error,
        isStreaming,
        jsx,
        onError,
        processedJsx,
        setError,
      ]
    );

    return (
      <JSXPreviewContext.Provider value={contextValue}>
        <div className={cn("relative", className)} {...props}>
          {children}
        </div>
      </JSXPreviewContext.Provider>
    );
  }
);

JSXPreview.displayName = "JSXPreview";
