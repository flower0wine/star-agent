"use client";

import type { ComponentProps } from "react";
import type { Experimental_SpeechResult as SpeechResult } from "ai";

export type AudioPlayerElementProps = Omit<ComponentProps<"audio">, "src">
  & (
    | {
      data: SpeechResult["audio"];
    }
    | {
      src: string;
    }
  );

export function AudioPlayerElement({ ...props }: AudioPlayerElementProps) {
  return (
    <audio
      data-slot="audio-player-element"
      slot="media"
      src={
        "src" in props
          ? props.src
          : `data:${props.data.mediaType};base64,${props.data.base64}`
      }
      {...props}
    />
  );
}
