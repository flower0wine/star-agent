"use client";

import type { ComponentProps } from "react";

import {
  ButtonGroupText,
} from "@/components/ui/button-group";
import { MediaVolumeRange } from "media-chrome/react";
import { cn } from "@/lib/utils";

export type AudioPlayerVolumeRangeProps = ComponentProps<
  typeof MediaVolumeRange
>;

export function AudioPlayerVolumeRange({
  className,
  ...props
}: AudioPlayerVolumeRangeProps) {
  return (
    <ButtonGroupText asChild className="bg-transparent">
      <MediaVolumeRange
        className={cn("", className)}
        data-slot="audio-player-volume-range"
        {...props}
      />
    </ButtonGroupText>
  );
}
