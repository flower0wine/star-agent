"use client";

import { useContext } from "react";

import { cn } from "@/lib/utils";

import { MicSelectorContext } from "./context";
import { MicSelectorLabel } from "./mic-selector-label";
import type { MicSelectorValueProps } from "./types";

export function MicSelectorValue({
  className,
  ...props
}: MicSelectorValueProps) {
  const { data, value } = useContext(MicSelectorContext);
  const currentDevice = data.find((d) => d.deviceId === value);

  if (!currentDevice) {
    return (
      <span className={cn("flex-1 text-left", className)} {...props}>
        Select microphone...
      </span>
    );
  }

  return (
    <MicSelectorLabel
      className={cn("flex-1 text-left", className)}
      device={currentDevice}
      {...props}
    />
  );
}
