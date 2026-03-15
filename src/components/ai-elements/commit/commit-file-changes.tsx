"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export type CommitFileChangesProps = HTMLAttributes<HTMLDivElement>;

export function CommitFileChanges({
  className,
  children,
  ...props
}: CommitFileChangesProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 font-mono text-xs",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CommitFileAdditionsProps = HTMLAttributes<HTMLSpanElement> & {
  count: number;
};

export function CommitFileAdditions({
  count,
  className,
  children,
  ...props
}: CommitFileAdditionsProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn("text-green-600 dark:text-green-400", className)}
      {...props}
    >
      {children ?? (
        <>
          <PlusIcon className="inline-block size-3" />
          {count}
        </>
      )}
    </span>
  );
}

export type CommitFileDeletionsProps = HTMLAttributes<HTMLSpanElement> & {
  count: number;
};

export function CommitFileDeletions({
  count,
  className,
  children,
  ...props
}: CommitFileDeletionsProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn("text-red-600 dark:text-red-400", className)}
      {...props}
    >
      {children ?? (
        <>
          <MinusIcon className="inline-block size-3" />
          {count}
        </>
      )}
    </span>
  );
}
