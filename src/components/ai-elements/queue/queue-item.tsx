"use client";

import { Button } from "@/components/ui/button";
import { PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  QueueItemActionProps,
  QueueItemActionsProps,
  QueueItemAttachmentProps,
  QueueItemContentProps,
  QueueItemDescriptionProps,
  QueueItemImageProps,
  QueueItemFileProps,
  QueueItemIndicatorProps,
  QueueItemProps,
} from "./types";

export function QueueItem({ className, ...props }: QueueItemProps) {
  return (
    <li
      className={cn(
        "group flex flex-col gap-1 rounded-md px-3 py-1 text-sm transition-colors hover:bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function QueueItemIndicator({
  completed = false,
  className,
  ...props
}: QueueItemIndicatorProps) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-block size-2.5 rounded-full border",
        completed
          ? "border-muted-foreground/20 bg-muted-foreground/10"
          : "border-muted-foreground/50",
        className
      )}
      {...props}
    />
  );
}

export function QueueItemContent({
  completed = false,
  className,
  ...props
}: QueueItemContentProps) {
  return (
    <span
      className={cn(
        "line-clamp-1 grow break-words",
        completed
          ? "text-muted-foreground/50 line-through"
          : "text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function QueueItemDescription({
  completed = false,
  className,
  ...props
}: QueueItemDescriptionProps) {
  return (
    <div
      className={cn(
        "ml-6 text-xs",
        completed
          ? "text-muted-foreground/40 line-through"
          : "text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function QueueItemActions({
  className,
  ...props
}: QueueItemActionsProps) {
  return <div className={cn("flex gap-1", className)} {...props} />;
}

export function QueueItemAction({
  className,
  ...props
}: QueueItemActionProps) {
  return (
    <Button
      className={cn(
        "size-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted-foreground/10 hover:text-foreground group-hover:opacity-100",
        className
      )}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    />
  );
}

export function QueueItemAttachment({
  className,
  ...props
}: QueueItemAttachmentProps) {
  return <div className={cn("mt-1 flex flex-wrap gap-2", className)} {...props} />;
}

export function QueueItemImage({
  className,
  ...props
}: QueueItemImageProps) {
  return (
    <img
      alt=""
      className={cn("h-8 w-8 rounded border object-cover", className)}
      height={32}
      width={32}
      {...props}
    />
  );
}

export function QueueItemFile({
  children,
  className,
  ...props
}: QueueItemFileProps) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs",
        className
      )}
      {...props}
    >
      <PaperclipIcon size={12} />
      <span className="max-w-[100px] truncate">{children}</span>
    </span>
  );
}
