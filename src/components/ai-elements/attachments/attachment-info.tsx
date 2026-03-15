"use client";

import { useAttachmentContext } from "./context";
import { getAttachmentLabel } from "./utils";
import { cn } from "@/lib/utils";

// ============================================================================
// AttachmentInfo - Name and type display
// ============================================================================

export type AttachmentInfoProps = React.HTMLAttributes<HTMLDivElement> & {
  showMediaType?: boolean;
};

export function AttachmentInfo({
  showMediaType = false,
  className,
  ...props
}: AttachmentInfoProps) {
  const { data, variant } = useAttachmentContext();
  const label = getAttachmentLabel(data);

  if (variant === "grid") {
    return null;
  }

  return (
    <div className={cn("min-w-0 flex-1", className)} {...props}>
      <span className="block truncate">{label}</span>
      {showMediaType && data.mediaType && (
        <span className="block truncate text-muted-foreground text-xs">
          {data.mediaType}
        </span>
      )}
    </div>
  );
}
