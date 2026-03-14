"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { GitHubUser } from "@/types/github";

export interface UserAvatarProps {
  user: GitHubUser;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
};

const fontSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function UserAvatar({
  user,
  size = "md",
  showName = true,
  className,
}: UserAvatarProps) {
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.login.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        showName ? "flex-row" : "justify-center",
        className
      )}
    >
      <Avatar className={sizeClasses[size]}>
        <AvatarImage
          src={user.avatar_url}
          alt={user.name || user.login}
          className="aspect-square"
        />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {showName && (
        <div className="flex flex-col">
          <span className={cn("font-medium text-foreground", fontSizeClasses[size])}>
            {user.name || user.login}
          </span>
          {user.name && (
            <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>
              @{user.login}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default UserAvatar;
