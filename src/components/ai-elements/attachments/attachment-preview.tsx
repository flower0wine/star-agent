"use client";

import type { ImageIcon } from "lucide-react";

import { useAttachmentContext } from "./context";
import { mediaCategoryIcons, renderAttachmentImage } from "./utils";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ============================================================================
// AttachmentPreview - Media preview
// ============================================================================

export type AttachmentPreviewProps = React.HTMLAttributes<HTMLDivElement> & {
  fallbackIcon?: ReactNode;
};

export function AttachmentPreview({
  fallbackIcon,
  className,
  ...props
}: AttachmentPreviewProps) {
  const { data, mediaCategory, variant } = useAttachmentContext();

  const iconSize = variant === "inline" ? "size-3" : "size-4";

  const renderIcon = (Icon: typeof ImageIcon) => (
    <Icon className={cn(iconSize, "text-muted-foreground")} />
  );

  const renderContent = async () => {
    if (mediaCategory === "image" && data.type === "file" && data.url) {
      return renderAttachmentImage(data.url, data.filename, variant === "grid");
    }

    if (mediaCategory === "video" && data.type === "file" && data.url) {
      return <video className="size-full object-cover" muted src={data.url} />;
    }

    const Icon = mediaCategoryIcons[mediaCategory];
    return fallbackIcon ?? renderIcon(Icon);
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        variant === "grid" && "size-full bg-muted",
        variant === "inline" && "size-5 rounded bg-background",
        variant === "list" && "size-12 rounded bg-muted",
        className
      )}
      {...props}
    >
      {renderContent()}
    </div>
  );
}
