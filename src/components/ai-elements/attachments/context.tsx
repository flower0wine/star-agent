"use client";

import { createContext, useContext, useMemo } from "react";

import type { AttachmentData, AttachmentVariant } from "./types";
import type { getMediaCategory } from "./utils";

// ============================================================================
// Contexts
// ============================================================================

interface AttachmentsContextValue {
  variant: AttachmentVariant;
}

export const AttachmentsContext = createContext<AttachmentsContextValue | null>(
  null
);

interface AttachmentContextValue {
  data: AttachmentData;
  mediaCategory: ReturnType<typeof getMediaCategory>;
  onRemove?: () => void;
  variant: AttachmentVariant;
}

export const AttachmentContext = createContext<AttachmentContextValue | null>(
  null
);

// ============================================================================
// Hooks
// ============================================================================

export function useAttachmentsContext() {
  return useContext(AttachmentsContext) ?? { variant: "grid" as const };
}

export function useAttachmentContext() {
  const ctx = useContext(AttachmentContext);
  if (!ctx) {
    throw new Error("Attachment components must be used within <Attachment>");
  }
  return ctx;
}
