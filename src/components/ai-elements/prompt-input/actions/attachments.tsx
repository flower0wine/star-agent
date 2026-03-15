"use client";

import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ImageIcon } from "lucide-react";
import { useCallback } from "react";
import { usePromptInputAttachments } from "../context";
import type { PromptInputActionAddAttachmentsProps } from "../types";

export function PromptInputActionAddAttachments({
  label = "Add photos or files",
  ...props
}: PromptInputActionAddAttachmentsProps) {
  const attachments = usePromptInputAttachments();

  const handleSelect = useCallback(
    (e: Event) => {
      e.preventDefault();
      attachments.openFileDialog();
    },
    [attachments]
  );

  return (
    <DropdownMenuItem {...props} onSelect={handleSelect}>
      <ImageIcon className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
}
