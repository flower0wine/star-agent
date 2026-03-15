"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

import { SchemaDisplayContext } from "./context";
import type {
  HttpMethod,
  SchemaParameter,
  SchemaProperty,
} from "./types";
import { SchemaDisplayContent } from "./schema-display-content";
import { SchemaDisplayDescription } from "./schema-display-description";
import { SchemaDisplayHeader } from "./schema-display-header";
import { SchemaDisplayMethod } from "./schema-display-method";
import { SchemaDisplayParameters } from "./schema-display-parameters";
import { SchemaDisplayPath } from "./schema-display-path";
import { SchemaDisplayRequest } from "./schema-display-request";
import { SchemaDisplayResponse } from "./schema-display-response";

export type SchemaDisplayProps = HTMLAttributes<HTMLDivElement> & {
  method: HttpMethod;
  path: string;
  description?: string;
  parameters?: SchemaParameter[];
  requestBody?: SchemaProperty[];
  responseBody?: SchemaProperty[];
};

export function SchemaDisplay({
  method,
  path,
  description,
  parameters,
  requestBody,
  responseBody,
  className,
  children,
  ...props
}: SchemaDisplayProps) {
  const contextValue = useMemo(
    () => ({
      description,
      method,
      parameters,
      path,
      requestBody,
      responseBody,
    }),
    [description, method, parameters, path, requestBody, responseBody]
  );

  return (
    <SchemaDisplayContext.Provider value={contextValue}>
      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-background",
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <SchemaDisplayHeader>
              <div className="flex items-center gap-3">
                <SchemaDisplayMethod />
                <SchemaDisplayPath />
              </div>
            </SchemaDisplayHeader>
            {description && <SchemaDisplayDescription />}
            <SchemaDisplayContent>
              {parameters && parameters.length > 0 && (
                <SchemaDisplayParameters />
              )}
              {requestBody && requestBody.length > 0 && (
                <SchemaDisplayRequest />
              )}
              {responseBody && responseBody.length > 0 && (
                <SchemaDisplayResponse />
              )}
            </SchemaDisplayContent>
          </>
        )}
      </div>
    </SchemaDisplayContext.Provider>
  );
}
