"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import JsxParser from "react-jsx-parser";
import type { TProps as JsxParserProps } from "react-jsx-parser";
import { useJSXPreview } from "./jsx-preview-context";

export type JSXPreviewContentProps = Omit<ComponentProps<"div">, "children">;

export const JSXPreviewContent = memo(
  ({ className, ...props }: JSXPreviewContentProps) => {
    const {
      processedJsx,
      isStreaming,
      components,
      bindings,
      setError,
      setLastGoodJsx,
      onErrorProp,
    } = useJSXPreview();
    const errorReportedRef = useRef<string | null>(null);
    const lastGoodJsxRef = useRef("");
    const [hadError, setHadError] = useState(false);

    // Reset error tracking when jsx changes
    useEffect(() => {
      errorReportedRef.current = null;
      setHadError(false);
    }, [processedJsx]);

    const handleError = useCallback(
      (err: Error) => {
        // Prevent duplicate error reports for the same jsx
        if (errorReportedRef.current === processedJsx) {
          return;
        }
        errorReportedRef.current = processedJsx;

        // During streaming, suppress errors and fall back to last good JSX
        if (isStreaming) {
          setHadError(true);
          return;
        }

        setError(err);
        onErrorProp?.(err);
      },
      [processedJsx, isStreaming, onErrorProp, setError]
    );

    // Track the last JSX that rendered without error
    useEffect(() => {
      if (!errorReportedRef.current) {
        lastGoodJsxRef.current = processedJsx;
        setLastGoodJsx(processedJsx);
      }
    }, [processedJsx, setLastGoodJsx]);

    // During streaming, if the current JSX errored, re-render with last good version
    const displayJsx
      = isStreaming && hadError ? lastGoodJsxRef.current : processedJsx;

    return (
      <div className={cn("jsx-preview-content", className)} {...props}>
        <JsxParser
          bindings={bindings}
          components={components}
          jsx={displayJsx}
          onError={handleError}
          renderInWrapper={false}
        />
      </div>
    );
  }
);

JSXPreviewContent.displayName = "JSXPreviewContent";
