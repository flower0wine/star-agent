"use client";

import type { ComponentProps } from "react";

import {
  ButtonGroupText,
} from "@/components/ui/button-group";
import { MediaTimeRange } from "media-chrome/react";
import { cn } from "@/lib/utils";

export type AudioPlayerTimeRangeProps = ComponentProps<
  typeof MediaTimeRange
>;

export function AudioPlayerTimeRange({
  className,
  ...props
}: AudioPlayerTimeRangeProps) {
  return (
    <ButtonGroupText asChild className="bg-transparent">
      <MediaTimeRange
        className={cn("", className)}
        data-slot="audio-player-time-range"
        {...props}
      />
    </ButtonGroupText>
  );
}
