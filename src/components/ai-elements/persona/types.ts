import type { RiveParameters } from "@rive-app/react-webgl2";

export type PersonaState
  = | "idle"
    | "listening"
    | "thinking"
    | "speaking"
    | "asleep";

export interface PersonaProps {
  state: PersonaState;
  onLoad?: RiveParameters["onLoad"];
  onLoadError?: RiveParameters["onLoadError"];
  onReady?: () => void;
  onPause?: RiveParameters["onPause"];
  onPlay?: RiveParameters["onPlay"];
  onStop?: RiveParameters["onStop"];
  className?: string;
  variant?: keyof typeof import("./config").sources;
}
