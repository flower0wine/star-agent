"use client";

import type { ComponentProps } from "react";

import { ButtonGroup } from "@/components/ui/button-group";
import { MediaControlBar } from "media-chrome/react";

export type AudioPlayerControlBarProps = ComponentProps<
  typeof MediaControlBar
>;

export function AudioPlayerControlBar({
  children,
  ...props
}: AudioPlayerControlBarProps) {
  return (
    <MediaControlBar data-slot="audio-player-control-bar" {...props}>
      <ButtonGroup orientation="horizontal">{children}</ButtonGroup>
    </MediaControlBar>
  );
}
