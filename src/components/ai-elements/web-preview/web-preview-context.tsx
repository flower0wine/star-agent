"use client";

import { createContext, useContext } from "react";

export interface WebPreviewContextValue {
  url: string;
  setUrl: (url: string) => void;
  consoleOpen: boolean;
  setConsoleOpen: (open: boolean) => void;
}

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

function useWebPreview() {
  const context = useContext(WebPreviewContext);
  if (!context) {
    throw new Error("WebPreview components must be used within a WebPreview");
  }
  return context;
}

export { useWebPreview, WebPreviewContext };
