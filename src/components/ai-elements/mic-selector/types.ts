import type { ComponentProps, ReactNode } from "react";

import type { Popover } from "@/components/ui/popover";
import type { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export const deviceIdRegex = /\(([\da-f]{4}:[\da-f]{4})\)$/i;

export interface MicSelectorContextType {
  data: MediaDeviceInfo[];
  value: string | undefined;
  onValueChange?: (value: string) => void;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  width: number;
  setWidth?: (width: number) => void;
}

export type MicSelectorProps = ComponentProps<typeof Popover> & {
  defaultValue?: string;
  value?: string | undefined;
  onValueChange?: (value: string | undefined) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type MicSelectorTriggerProps = ComponentProps<"button">;

export type MicSelectorContentProps = ComponentProps<typeof Command> & {
  popoverOptions?: ComponentProps<typeof Popover>;
};

export type MicSelectorInputProps = ComponentProps<typeof CommandInput> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export type MicSelectorListProps = Omit<
  ComponentProps<typeof CommandList>,
  "children"
> & {
  children: (devices: MediaDeviceInfo[]) => ReactNode;
};

export type MicSelectorEmptyProps = ComponentProps<typeof CommandEmpty>;

export type MicSelectorItemProps = ComponentProps<typeof CommandItem>;

export type MicSelectorLabelProps = ComponentProps<"span"> & {
  device: MediaDeviceInfo;
};

export type MicSelectorValueProps = ComponentProps<"span">;
