"use client";

import { useCallback, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { WebPreviewContext } from "./web-preview-context";
import type { WebPreviewContextValue } from "./web-preview-context";

export type WebPreviewProps = ComponentProps<"div"> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
};

export function WebPreview({
  className,
  children,
  defaultUrl = "",
  onUrlChange,
  ...props
}: WebPreviewProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [consoleOpen, setConsoleOpen] = useState(false);

  const handleUrlChange = useCallback(
    (newUrl: string) => {
      setUrl(newUrl);
      onUrlChange?.(newUrl);
    },
    [onUrlChange]
  );

  const contextValue = useMemo<WebPreviewContextValue>(
    () => ({
      consoleOpen,
      setConsoleOpen,
      setUrl: handleUrlChange,
      url,
    }),
    [consoleOpen, handleUrlChange, url]
  );

  return (
    <WebPreviewContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex size-full flex-col rounded-lg border bg-card",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </WebPreviewContext.Provider>
  );
}
