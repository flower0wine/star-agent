"use client";

import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { memo } from "react";
import { useJSXPreview } from "./jsx-preview-context";

export type JSXPreviewErrorProps = ComponentProps<"div"> & {
  children?: ReactNode | ((error: Error) => ReactNode);
};

function renderChildren(
  children: ReactNode | ((error: Error) => ReactNode),
  error: Error
): ReactNode {
  if (typeof children === "function") {
    return children(error);
  }
  return children;
}

export const JSXPreviewError = memo(
  ({ className, children, ...props }: JSXPreviewErrorProps) => {
    const { error } = useJSXPreview();

    if (!error) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm",
          className
        )}
        {...props}
      >
        {children ? (
          renderChildren(children, error)
        ) : (
          <>
            <AlertCircle className="size-4 shrink-0" />
            <span>{error.message}</span>
          </>
        )}
      </div>
    );
  }
);

JSXPreviewError.displayName = "JSXPreviewError";
