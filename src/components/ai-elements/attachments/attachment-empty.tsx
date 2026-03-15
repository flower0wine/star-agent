"use client";

import { cn } from "@/lib/utils";

// ============================================================================
// AttachmentEmpty - Empty state
// ============================================================================

export type AttachmentEmptyProps = React.HTMLAttributes<HTMLDivElement>;

export function AttachmentEmpty({
  className,
  children,
  ...props
}: AttachmentEmptyProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center p-4 text-muted-foreground text-sm",
        className
      )}
      {...props}
    >
      {children ?? "No attachments"}
    </div>
  );
}
