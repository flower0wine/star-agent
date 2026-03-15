"use client";

import { PauseIcon, PlayIcon } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

import type { VoiceSelectorPreviewProps } from "./types";

export function VoiceSelectorPreview({
  className,
  playing,
  loading,
  onPlay,
  onClick,
  ...props
}: VoiceSelectorPreviewProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onClick?.(event);
      onPlay?.();
    },
    [onClick, onPlay]
  );

  let icon = <PlayIcon className="size-3" />;

  if (loading) {
    icon = <Spinner className="size-3" />;
  } else if (playing) {
    icon = <PauseIcon className="size-3" />;
  }

  return (
    <Button
      aria-label={playing ? "Pause preview" : "Play preview"}
      className={cn("size-6", className)}
      disabled={loading}
      onClick={handleClick}
      size="icon-sm"
      type="button"
      variant="outline"
      {...props}
    >
      {icon}
    </Button>
  );
}
