"use client";

import { FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type CommitFileIconProps = ComponentProps<typeof FileIcon>;

export function CommitFileIcon({
  className,
  ...props
}: CommitFileIconProps) {
  return (
    <FileIcon
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      {...props}
    />
  );
}
