"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { MediaPlayButton } from "media-chrome/react";
import { cn } from "@/lib/utils";

export type AudioPlayerPlayButtonProps = ComponentProps<
  typeof MediaPlayButton
>;

export function AudioPlayerPlayButton({
  className,
  ...props
}: AudioPlayerPlayButtonProps) {
  return (
    <Button asChild size="icon-sm" variant="outline">
      <MediaPlayButton
        className={cn("bg-transparent", className)}
        data-slot="audio-player-play-button"
        {...props}
      />
    </Button>
  );
}
