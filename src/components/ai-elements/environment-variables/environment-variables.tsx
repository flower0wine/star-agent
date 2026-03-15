"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  EnvironmentVariablesContext,
  EnvironmentVariableContext,
} from "./context";
import type { EnvironmentVariablesProps } from "./types";

export function EnvironmentVariables({
  showValues: controlledShowValues,
  defaultShowValues = false,
  onShowValuesChange,
  className,
  children,
  ...props
}: EnvironmentVariablesProps) {
  const [internalShowValues, setInternalShowValues] = useState(defaultShowValues);
  const showValues = controlledShowValues ?? internalShowValues;

  const setShowValues = useCallback(
    (show: boolean) => {
      setInternalShowValues(show);
      onShowValuesChange?.(show);
    },
    [onShowValuesChange]
  );

  const contextValue = useMemo(
    () => ({ setShowValues, showValues }),
    [setShowValues, showValues]
  );

  return (
    <EnvironmentVariablesContext.Provider value={contextValue}>
      <div
        className={cn("rounded-lg border bg-background", className)}
        {...props}
      >
        {children}
      </div>
    </EnvironmentVariablesContext.Provider>
  );
}
