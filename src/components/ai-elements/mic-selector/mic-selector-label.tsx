"use client";

import { deviceIdRegex } from "./types";

import type { MicSelectorLabelProps } from "./types";

export function MicSelectorLabel({
  device,
  className,
  ...props
}: MicSelectorLabelProps) {
  const matches = device.label.match(deviceIdRegex);

  if (!matches) {
    return (
      <span className={className} {...props}>
        {device.label}
      </span>
    );
  }

  const [, deviceId] = matches;
  const name = device.label.replace(deviceIdRegex, "");

  return (
    <span className={className} {...props}>
      <span>{name}</span>
      <span className="text-muted-foreground"> ({deviceId})</span>
    </span>
  );
}
