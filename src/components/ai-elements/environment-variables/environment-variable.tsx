"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

import { EnvironmentVariableContext } from "./context";
import { EnvironmentVariableName } from "./environment-variable-name";
import { EnvironmentVariableValue } from "./environment-variable-value";
import type { EnvironmentVariableProps } from "./types";

export function EnvironmentVariable({
  name,
  value,
  className,
  children,
  ...props
}: EnvironmentVariableProps) {
  const envVarContextValue = useMemo(() => ({ name, value }), [name, value]);

  return (
    <EnvironmentVariableContext.Provider value={envVarContextValue}>
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <div className="flex items-center gap-2">
              <EnvironmentVariableName />
            </div>
            <EnvironmentVariableValue />
          </>
        )}
      </div>
    </EnvironmentVariableContext.Provider>
  );
}
