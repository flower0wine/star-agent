"use client";

import type { ComponentProps } from "react";

import {
  ButtonGroupText,
} from "@/components/ui/button-group";
import { MediaTimeDisplay } from "media-chrome/react";
import { cn } from "@/lib/utils";

export type AudioPlayerTimeDisplayProps = ComponentProps<
  typeof MediaTimeDisplay
>;

export function AudioPlayerTimeDisplay({
  className,
  ...props
}: AudioPlayerTimeDisplayProps) {
  return (
    <ButtonGroupText asChild className="bg-transparent">
      <MediaTimeDisplay
        className={cn("tabular-nums", className)}
        data-slot="audio-player-time-display"
        {...props}
      />
    </ButtonGroupText>
  );
}
