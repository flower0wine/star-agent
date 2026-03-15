"use client";

import { useMemo } from "react";

import type { AttachmentVariant } from "./types";
import { AttachmentsContext } from "./context";
import { cn } from "@/lib/utils";

// ============================================================================
// Attachments - Container
// ============================================================================

export type AttachmentsProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AttachmentVariant;
};

export function Attachments({
  variant = "grid",
  className,
  children,
  ...props
}: AttachmentsProps) {
  const contextValue = useMemo(() => ({ variant }), [variant]);

  return (
    <AttachmentsContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex items-start",
          variant === "list" ? "flex-col gap-2" : "flex-wrap gap-2",
          variant === "grid" && "ml-auto w-fit",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  );
}
