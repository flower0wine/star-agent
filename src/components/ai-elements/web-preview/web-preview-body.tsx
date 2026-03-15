"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { useWebPreview } from "./web-preview-context";

export type WebPreviewBodyProps = ComponentProps<"iframe"> & {
  loading?: ReactNode;
};

export function WebPreviewBody({
  className,
  loading,
  src,
  ...props
}: WebPreviewBodyProps) {
  const { url } = useWebPreview();

  return (
    <div className="flex-1">
      <iframe
        className={cn("size-full", className)}
        // oxlint-disable-next-line eslint-plugin-react(iframe-missing-sandbox)
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={(src ?? url) || undefined}
        title="Preview"
        {...props}
      />
      {loading}
    </div>
  );
}
