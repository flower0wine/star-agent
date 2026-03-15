"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { MediaSeekForwardButton } from "media-chrome/react";

export type AudioPlayerSeekForwardButtonProps = ComponentProps<
  typeof MediaSeekForwardButton
>;

export function AudioPlayerSeekForwardButton({
  seekOffset = 10,
  ...props
}: AudioPlayerSeekForwardButtonProps) {
  return (
    <Button asChild size="icon-sm" variant="outline">
      <MediaSeekForwardButton
        data-slot="audio-player-seek-forward-button"
        seekOffset={seekOffset}
        {...props}
      />
    </Button>
  );
}
