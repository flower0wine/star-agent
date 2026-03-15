"use client";

import { cn } from "@/lib/utils";

import type {
  VoiceSelectorAgeProps,
  VoiceSelectorAttributesProps,
  VoiceSelectorBulletProps,
  VoiceSelectorDescriptionProps,
  VoiceSelectorNameProps,
} from "./types";

export function VoiceSelectorAge({
  className,
  ...props
}: VoiceSelectorAgeProps) {
  return (
    <span
      className={cn("text-muted-foreground text-xs tabular-nums", className)}
      {...props}
    />
  );
}

export function VoiceSelectorName({
  className,
  ...props
}: VoiceSelectorNameProps) {
  return (
    <span
      className={cn("flex-1 truncate text-left font-medium", className)}
      {...props}
    />
  );
}

export function VoiceSelectorDescription({
  className,
  ...props
}: VoiceSelectorDescriptionProps) {
  return (
    <span className={cn("text-muted-foreground text-xs", className)} {...props} />
  );
}

export function VoiceSelectorAttributes({
  className,
  children,
  ...props
}: VoiceSelectorAttributesProps) {
  return (
    <div className={cn("flex items-center text-xs", className)} {...props}>
      {children}
    </div>
  );
}

export function VoiceSelectorBullet({
  className,
  ...props
}: VoiceSelectorBulletProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("select-none text-border", className)}
      {...props}
    >
      &bull;
    </span>
  );
}
