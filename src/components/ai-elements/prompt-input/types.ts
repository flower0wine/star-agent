import type { FileUIPart, SourceDocumentUIPart, ChatStatus } from "ai";
import type { ReactNode, RefObject, PropsWithChildren, ComponentProps, HTMLAttributes, FormEvent } from "react";

// Import UI components for type extraction
import type {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from "@/components/ui/input-group";
import {
  InputGroup
} from "@/components/ui/input-group";
import type {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type {
  TooltipContent,
} from "@/components/ui/tooltip";

// ============================================================================
// Context Types
// ============================================================================

export interface AttachmentsContext {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export interface TextInputContext {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
}

export interface PromptInputControllerProps {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
  /** INTERNAL: Allows PromptInput to register its file textInput + "open" callback */
  __registerFileInput: (
    ref: RefObject<HTMLInputElement | null>,
    open: () => void
  ) => void;
}

// ============================================================================
// Referenced Sources
// ============================================================================

export interface ReferencedSourcesContext {
  sources: (SourceDocumentUIPart & { id: string })[];
  add: (sources: SourceDocumentUIPart[] | SourceDocumentUIPart) => void;
  remove: (id: string) => void;
  clear: () => void;
}

// ============================================================================
// Provider Props
// ============================================================================

export type PromptInputProviderProps = PropsWithChildren<{
  initialInput?: string;
}>;

// ============================================================================
// Action Props
// ============================================================================

export type PromptInputActionAddAttachmentsProps = ComponentProps<
  typeof DropdownMenuItem
> & {
  label?: string;
};

export type PromptInputActionAddScreenshotProps = ComponentProps<
  typeof DropdownMenuItem
> & {
  label?: string;
};

// ============================================================================
// Message Type
// ============================================================================

export interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

// ============================================================================
// Main Component Props
// ============================================================================

export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  // e.g., "image/*" or leave undefined for any
  accept?: string;
  multiple?: boolean;
  // When true, accepts drops anywhere on document. Default false (opt-in).
  globalDrop?: boolean;
  // Render a hidden input with given name and keep it in sync for native form posts. Default false.
  syncHiddenInput?: boolean;
  // Minimal constraints
  maxFiles?: number;
  // bytes
  maxFileSize?: number;
  onError?: (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>
  ) => void | Promise<void>;
};

// ============================================================================
// Sub-component Props
// ============================================================================

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;

export type PromptInputTextareaProps = ComponentProps<
  typeof InputGroupTextarea
>;

export type PromptInputHeaderProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export type PromptInputFooterProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export type PromptInputButtonTooltip
  = | string
    | {
      content: ReactNode;
      shortcut?: string;
      side?: ComponentProps<typeof TooltipContent>["side"];
    };

export type PromptInputButtonProps = ComponentProps<
  typeof InputGroupButton
> & {
  tooltip?: PromptInputButtonTooltip;
};

export type PromptInputActionMenuProps = ComponentProps<
  typeof DropdownMenu
>;

export type PromptInputActionMenuTriggerProps = PromptInputButtonProps;

export type PromptInputActionMenuContentProps = ComponentProps<
  typeof DropdownMenuContent
>;

export type PromptInputActionMenuItemProps = ComponentProps<
  typeof DropdownMenuItem
>;

export type PromptInputSubmitProps = ComponentProps<
  typeof InputGroupButton
> & {
  status?: ChatStatus;
  onStop?: () => void;
};

// ============================================================================
// Select Props
// ============================================================================

export type PromptInputSelectProps = ComponentProps<typeof Select>;

export type PromptInputSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export type PromptInputSelectContentProps = ComponentProps<
  typeof SelectContent
>;

export type PromptInputSelectItemProps = ComponentProps<typeof SelectItem>;

export type PromptInputSelectValueProps = ComponentProps<typeof SelectValue>;

// ============================================================================
// HoverCard Props
// ============================================================================

export type PromptInputHoverCardProps = ComponentProps<typeof HoverCard>;

export type PromptInputHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>;

export type PromptInputHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>;

// ============================================================================
// Tabs Props
// ============================================================================

export type PromptInputTabsListProps = HTMLAttributes<HTMLDivElement>;

export type PromptInputTabProps = HTMLAttributes<HTMLDivElement>;

export type PromptInputTabLabelProps = HTMLAttributes<HTMLHeadingElement>;

export type PromptInputTabBodyProps = HTMLAttributes<HTMLDivElement>;

export type PromptInputTabItemProps = HTMLAttributes<HTMLDivElement>;

// ============================================================================
// Command Props
// ============================================================================

export type PromptInputCommandProps = ComponentProps<typeof Command>;

export type PromptInputCommandInputProps = ComponentProps<typeof CommandInput>;

export type PromptInputCommandListProps = ComponentProps<typeof CommandList>;

export type PromptInputCommandEmptyProps = ComponentProps<typeof CommandEmpty>;

export type PromptInputCommandGroupProps = ComponentProps<typeof CommandGroup>;

export type PromptInputCommandItemProps = ComponentProps<typeof CommandItem>;

export type PromptInputCommandSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;
