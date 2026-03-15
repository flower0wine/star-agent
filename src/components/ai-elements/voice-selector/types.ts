import type { ComponentProps, ReactNode } from "react";

import type { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";

export interface VoiceSelectorContextValue {
  value: string | undefined;
  setValue: (value: string | undefined) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export type VoiceSelectorProps = ComponentProps<typeof Dialog> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string | undefined) => void;
};

export type VoiceSelectorTriggerProps = ComponentProps<typeof DialogTrigger>;

export type VoiceSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};

export type VoiceSelectorDialogProps = ComponentProps<typeof CommandDialog>;

export type VoiceSelectorInputProps = ComponentProps<typeof CommandInput>;

export type VoiceSelectorListProps = ComponentProps<typeof CommandList>;

export type VoiceSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export type VoiceSelectorGroupProps = ComponentProps<typeof CommandGroup>;

export type VoiceSelectorItemProps = ComponentProps<typeof CommandItem>;

export type VoiceSelectorShortcutProps = ComponentProps<typeof CommandShortcut>;

export type VoiceSelectorSeparatorProps = ComponentProps<typeof CommandSeparator>;

export type VoiceSelectorGenderProps = ComponentProps<"span"> & {
  value?:
    | "male"
    | "female"
    | "transgender"
    | "androgyne"
    | "non-binary"
    | "intersex";
};

export type VoiceSelectorAccentProps = ComponentProps<"span"> & {
  value?:
    | "american"
    | "british"
    | "australian"
    | "canadian"
    | "irish"
    | "scottish"
    | "indian"
    | "south-african"
    | "new-zealand"
    | "spanish"
    | "french"
    | "german"
    | "italian"
    | "portuguese"
    | "brazilian"
    | "mexican"
    | "argentinian"
    | "japanese"
    | "chinese"
    | "korean"
    | "russian"
    | "arabic"
    | "dutch"
    | "swedish"
    | "norwegian"
    | "danish"
    | "finnish"
    | "polish"
    | "turkish"
    | "greek"
    | string;
};

export type VoiceSelectorAgeProps = ComponentProps<"span">;

export type VoiceSelectorNameProps = ComponentProps<"span">;

export type VoiceSelectorDescriptionProps = ComponentProps<"span">;

export type VoiceSelectorAttributesProps = ComponentProps<"div">;

export type VoiceSelectorBulletProps = ComponentProps<"span">;

export type VoiceSelectorPreviewProps = Omit<
  ComponentProps<"button">,
  "children"
> & {
  playing?: boolean;
  loading?: boolean;
  onPlay?: () => void;
};
