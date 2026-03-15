"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ComponentProps, HTMLAttributes } from "react";

export type CommitAuthorProps = HTMLAttributes<HTMLDivElement>;

export function CommitAuthor({
  className,
  children,
  ...props
}: CommitAuthorProps) {
  return (
    <div className={cn("flex items-center", className)} {...props}>
      {children}
    </div>
  );
}

export type CommitAuthorAvatarProps = ComponentProps<typeof Avatar> & {
  initials: string;
};

export function CommitAuthorAvatar({
  initials,
  className,
  ...props
}: CommitAuthorAvatarProps) {
  return (
    <Avatar className={cn("size-8", className)} {...props}>
      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
    </Avatar>
  );
}
