// Re-export all components and types from their respective files

// Components
export { Attachment } from "./attachment";

export type { AttachmentProps } from "./attachment";

export { AttachmentEmpty } from "./attachment-empty";

export type { AttachmentEmptyProps } from "./attachment-empty";
export { AttachmentHoverCard, AttachmentHoverCardContent, AttachmentHoverCardTrigger } from "./attachment-hover-card";

export type {
  AttachmentHoverCardContentProps,
  AttachmentHoverCardProps,
  AttachmentHoverCardTriggerProps,
} from "./attachment-hover-card";
export { AttachmentInfo } from "./attachment-info";

export type { AttachmentInfoProps } from "./attachment-info";
export { AttachmentPreview } from "./attachment-preview";

export type { AttachmentPreviewProps } from "./attachment-preview";
export { AttachmentRemove } from "./attachment-remove";

export type { AttachmentRemoveProps } from "./attachment-remove";
export { Attachments } from "./attachments";

export type { AttachmentsProps } from "./attachments";
// Context and hooks
export {
  AttachmentContext,
  AttachmentsContext,
  useAttachmentContext,
  useAttachmentsContext,
} from "./context";

// Types
export type {
  AttachmentData,
  AttachmentMediaCategory,
  AttachmentVariant,
} from "./types";
export { mediaCategoryIcons } from "./types";

// Utility functions
export { getAttachmentLabel, getMediaCategory, renderAttachmentImage } from "./utils";
