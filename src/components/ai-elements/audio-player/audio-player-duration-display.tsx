"use client";

import type { ComponentProps } from "react";

import {
  ButtonGroupText,
} from "@/components/ui/button-group";
import { MediaDurationDisplay } from "media-chrome/react";
import { cn } from "@/lib/utils";

export type AudioPlayerDurationDisplayProps = ComponentProps<
  typeof MediaDurationDisplay
>;

export function AudioPlayerDurationDisplay({
  className,
  ...props
}: AudioPlayerDurationDisplayProps) {
  return (
    <ButtonGroupText asChild className="bg-transparent">
      <MediaDurationDisplay
        className={cn("tabular-nums", className)}
        data-slot="audio-player-duration-display"
        {...props}
      />
    </ButtonGroupText>
  );
}
