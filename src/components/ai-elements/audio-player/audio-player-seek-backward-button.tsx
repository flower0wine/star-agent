"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { MediaSeekBackwardButton } from "media-chrome/react";

export type AudioPlayerSeekBackwardButtonProps = ComponentProps<
  typeof MediaSeekBackwardButton
>;

export function AudioPlayerSeekBackwardButton({
  seekOffset = 10,
  ...props
}: AudioPlayerSeekBackwardButtonProps) {
  return (
    <Button asChild size="icon-sm" variant="outline">
      <MediaSeekBackwardButton
        data-slot="audio-player-seek-backward-button"
        seekOffset={seekOffset}
        {...props}
      />
    </Button>
  );
}
