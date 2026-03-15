"use client";

import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "@/components/ui/button-group";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentProps, HTMLAttributes } from "react";
import { useMessageBranch } from "./message-branch";

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export function MessageBranchSelector({
  className,
  ...props
}: MessageBranchSelectorProps) {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return (
    <ButtonGroup
      className={cn(
        "[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md",
        className
      )}
      orientation="horizontal"
      {...props}
    />
  );
}

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export function MessageBranchPrevious({
  children,
  ...props
}: MessageBranchPreviousProps) {
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
}

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export function MessageBranchNext({
  children,
  ...props
}: MessageBranchNextProps) {
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
}

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export function MessageBranchPage({
  className,
  ...props
}: MessageBranchPageProps) {
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText
      className={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        className
      )}
      {...props}
    >
      {currentBranch + 1} of {totalBranches}
    </ButtonGroupText>
  );
}
