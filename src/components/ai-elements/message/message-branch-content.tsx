"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo } from "react";
import type { HTMLAttributes } from "react";
import { useMessageBranch } from "./message-branch";

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageBranchContent({
  children,
  ...props
}: MessageBranchContentProps) {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches.length, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
}
