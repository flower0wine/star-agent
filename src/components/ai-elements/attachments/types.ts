import type { FileUIPart, SourceDocumentUIPart } from "ai";
import {
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  Music2Icon,
  PaperclipIcon,
  VideoIcon,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type AttachmentData
  = | (FileUIPart & { id: string })
    | (SourceDocumentUIPart & { id: string });

export type AttachmentMediaCategory
  = | "image"
    | "video"
    | "audio"
    | "document"
    | "source"
    | "unknown";

export type AttachmentVariant = "grid" | "inline" | "list";

// ============================================================================
// Constants
// ============================================================================

export const mediaCategoryIcons: Record<AttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,
  image: ImageIcon,
  source: GlobeIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};
