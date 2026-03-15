"use client";

import type { ComponentProps } from "react";

import {
  ButtonGroupText,
} from "@/components/ui/button-group";
import { MediaMuteButton } from "media-chrome/react";
import { cn } from "@/lib/utils";

export type AudioPlayerMuteButtonProps = ComponentProps<
  typeof MediaMuteButton
>;

export function AudioPlayerMuteButton({
  className,
  ...props
}: AudioPlayerMuteButtonProps) {
  return (
    <ButtonGroupText asChild className="bg-transparent">
      <MediaMuteButton
        className={cn("", className)}
        data-slot="audio-player-mute-button"
        {...props}
      />
    </ButtonGroupText>
  );
}
