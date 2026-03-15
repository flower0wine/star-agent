"use client";

import { useMemo } from "react";

import type { AttachmentData, AttachmentVariant } from "./types";
import { AttachmentContext, useAttachmentsContext } from "./context";
import { getMediaCategory } from "./utils";
import { cn } from "@/lib/utils";

// ============================================================================
// Attachment - Item
// ============================================================================

export type AttachmentProps = React.HTMLAttributes<HTMLDivElement> & {
  data: AttachmentData;
  onRemove?: () => void;
};

export function Attachment({
  data,
  onRemove,
  className,
  children,
  ...props
}: AttachmentProps) {
  const { variant } = useAttachmentsContext();
  const mediaCategory = getMediaCategory(data);

  const contextValue = useMemo<{
    data: AttachmentData;
    mediaCategory: ReturnType<typeof getMediaCategory>;
    onRemove?: () => void;
    variant: AttachmentVariant;
  }>(() => ({ data, mediaCategory, onRemove, variant }), [data, mediaCategory, onRemove, variant]);

  return (
    <AttachmentContext.Provider value={contextValue}>
      <div
        className={cn(
          "group relative",
          variant === "grid" && "size-24 overflow-hidden rounded-lg",
          variant === "inline" && [
            "flex h-8 cursor-pointer select-none items-center gap-1.5",
            "rounded-md border border-border px-1.5",
            "font-medium text-sm transition-all",
            "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
          ],
          variant === "list" && [
            "flex w-full items-center gap-3 rounded-lg border p-3",
            "hover:bg-accent/50",
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  );
}
