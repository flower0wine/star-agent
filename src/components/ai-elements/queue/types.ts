import type { ComponentProps } from "react";

export interface QueueMessagePart {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
}

export interface QueueMessage {
  id: string;
  parts: QueueMessagePart[];
}

export interface QueueTodo {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "completed";
}

export type QueueItemProps = ComponentProps<"li">;
export type QueueItemIndicatorProps = ComponentProps<"span"> & {
  completed?: boolean;
};
export type QueueItemContentProps = ComponentProps<"span"> & {
  completed?: boolean;
};
export type QueueItemDescriptionProps = ComponentProps<"div"> & {
  completed?: boolean;
};
export type QueueItemActionsProps = ComponentProps<"div">;
export type QueueItemActionProps = Omit<
  ComponentProps<typeof import("@/components/ui/button").Button>,
  "variant" | "size"
>;
export type QueueItemAttachmentProps = ComponentProps<"div">;
export type QueueItemImageProps = ComponentProps<"img">;
export type QueueItemFileProps = ComponentProps<"span">;
export type QueueListProps = ComponentProps<typeof import("@/components/ui/scroll-area").ScrollArea>;
export type QueueSectionProps = ComponentProps<typeof import("@/components/ui/collapsible").Collapsible>;
export type QueueSectionTriggerProps = ComponentProps<"button">;
export type QueueSectionLabelProps = ComponentProps<"span"> & {
  count?: number;
  label: string;
  icon?: React.ReactNode;
};
export type QueueSectionContentProps = ComponentProps<
  typeof import("@/components/ui/collapsible").CollapsibleContent
>;
export type QueueProps = ComponentProps<"div">;
