"use client";

import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Monitor } from "lucide-react";
import { useCallback } from "react";
import { usePromptInputAttachments } from "../context";
import { captureScreenshot } from "../utils";
import type { PromptInputActionAddScreenshotProps } from "../types";

export function PromptInputActionAddScreenshot({
  label = "Take screenshot",
  onSelect,
  ...props
}: PromptInputActionAddScreenshotProps) {
  const attachments = usePromptInputAttachments();

  const handleSelect = useCallback(
    async (event: Event) => {
      onSelect?.(event);
      if (event.defaultPrevented) {
        return;
      }

      try {
        const screenshot = await captureScreenshot();
        if (screenshot) {
          attachments.add([screenshot]);
        }
      } catch (error) {
        if (
          error instanceof DOMException
          && (error.name === "NotAllowedError" || error.name === "AbortError")
        ) {
          return;
        }
        throw error;
      }
    },
    [onSelect, attachments]
  );

  return (
    <DropdownMenuItem {...props} onSelect={handleSelect}>
      <Monitor className="mr-2 size-4" />
      {label}
    </DropdownMenuItem>
  );
}
