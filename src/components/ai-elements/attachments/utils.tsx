import { ImageIcon } from "lucide-react";

import type { AttachmentData, AttachmentMediaCategory } from "./types";

// ============================================================================
// Utility Functions
// ============================================================================

export function getMediaCategory(data: AttachmentData): AttachmentMediaCategory {
  if (data.type === "source-document") {
    return "source";
  }

  const mediaType = data.mediaType ?? "";

  if (mediaType.startsWith("image/")) {
    return "image";
  }
  if (mediaType.startsWith("video/")) {
    return "video";
  }
  if (mediaType.startsWith("audio/")) {
    return "audio";
  }
  if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) {
    return "document";
  }

  return "unknown";
}

export function getAttachmentLabel(data: AttachmentData): string {
  if (data.type === "source-document") {
    return data.title || data.filename || "Source";
  }

  const category = getMediaCategory(data);
  return data.filename || (category === "image" ? "Image" : "Attachment");
}

export function renderAttachmentImage(
  url: string,
  filename: string | undefined,
  isGrid: boolean
) {
  return isGrid ? (
    <img
      alt={filename || "Image"}
      className="size-full object-cover"
      height={96}
      src={url}
      width={96}
    />
  ) : (
    <img
      alt={filename || "Image"}
      className="size-full rounded object-cover"
      height={20}
      src={url}
      width={20}
    />
  );
}

// Re-export mediaCategoryIcons from types for convenience
export { mediaCategoryIcons } from "./types";
export type {
  AttachmentData,
  AttachmentMediaCategory,
  AttachmentVariant,
} from "./types";
