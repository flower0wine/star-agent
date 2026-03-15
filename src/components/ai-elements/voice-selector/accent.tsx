"use client";

import { cn } from "@/lib/utils";

import type { VoiceSelectorAccentProps } from "./types";

export function VoiceSelectorAccent({
  className,
  value,
  children,
  ...props
}: VoiceSelectorAccentProps) {
  let emoji: string | null = null;

  switch (value) {
    case "american": {
      emoji = "🇺🇸";
      break;
    }
    case "british": {
      emoji = "🇬🇧";
      break;
    }
    case "australian": {
      emoji = "🇦🇺";
      break;
    }
    case "canadian": {
      emoji = "🇨🇦";
      break;
    }
    case "irish": {
      emoji = "🇮🇪";
      break;
    }
    case "scottish": {
      emoji = "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
      break;
    }
    case "indian": {
      emoji = "🇮🇳";
      break;
    }
    case "south-african": {
      emoji = "🇿🇦";
      break;
    }
    case "new-zealand": {
      emoji = "🇳🇿";
      break;
    }
    case "spanish": {
      emoji = "🇪🇸";
      break;
    }
    case "french": {
      emoji = "🇫🇷";
      break;
    }
    case "german": {
      emoji = "🇩🇪";
      break;
    }
    case "italian": {
      emoji = "🇮🇹";
      break;
    }
    case "portuguese": {
      emoji = "🇵🇹";
      break;
    }
    case "brazilian": {
      emoji = "🇧🇷";
      break;
    }
    case "mexican": {
      emoji = "🇲🇽";
      break;
    }
    case "argentinian": {
      emoji = "🇦🇷";
      break;
    }
    case "japanese": {
      emoji = "🇯🇵";
      break;
    }
    case "chinese": {
      emoji = "🇨🇳";
      break;
    }
    case "korean": {
      emoji = "🇰🇷";
      break;
    }
    case "russian": {
      emoji = "🇷🇺";
      break;
    }
    case "arabic": {
      emoji = "🇸🇦";
      break;
    }
    case "dutch": {
      emoji = "🇳🇱";
      break;
    }
    case "swedish": {
      emoji = "🇸🇪";
      break;
    }
    case "norwegian": {
      emoji = "🇳🇴";
      break;
    }
    case "danish": {
      emoji = "🇩🇰";
      break;
    }
    case "finnish": {
      emoji = "🇫🇮";
      break;
    }
    case "polish": {
      emoji = "🇵🇱";
      break;
    }
    case "turkish": {
      emoji = "🇹🇷";
      break;
    }
    case "greek": {
      emoji = "🇬🇷";
      break;
    }
    default: {
      emoji = null;
    }
  }

  return (
    <span className={cn("text-muted-foreground text-xs", className)} {...props}>
      {children ?? emoji}
    </span>
  );
}
