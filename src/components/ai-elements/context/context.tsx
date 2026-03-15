"use client";

import { createContext, useContext, useMemo } from "react";

import type { ContextSchema } from "./types";

const ContextContext = createContext<ContextSchema | null>(null);

export function useContextValue() {
  const context = useContext(ContextContext);

  if (!context) {
    throw new Error("Context components must be used within Context");
  }

  return context;
}

export { ContextContext };

interface ContextProviderProps {
  children: React.ReactNode;
  value: ContextSchema;
}

export function ContextProvider({ children, value }: ContextProviderProps) {
  const contextValue = useMemo(
    () => ({ maxTokens: value.maxTokens, modelId: value.modelId, usage: value.usage, usedTokens: value.usedTokens }),
    [value.maxTokens, value.modelId, value.usage, value.usedTokens]
  );

  return (
    <ContextContext.Provider value={contextValue}>
      {children}
    </ContextContext.Provider>
  );
}
