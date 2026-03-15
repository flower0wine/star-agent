"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Dialog } from "@/components/ui/dialog";
import { createContext, useContext, useMemo } from "react";

import type { VoiceSelectorContextValue, VoiceSelectorProps } from "./types";

export const VoiceSelectorContext = createContext<VoiceSelectorContextValue | null>(
  null
);

export function useVoiceSelector() {
  const context = useContext(VoiceSelectorContext);
  if (!context) {
    throw new Error(
      "VoiceSelector components must be used within VoiceSelector"
    );
  }
  return context;
}

export function VoiceSelector({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: VoiceSelectorProps) {
  const [value, setValue] = useControllableState({
    defaultProp: defaultValue,
    onChange: onValueChange,
    prop: valueProp,
  });

  const [open, setOpen] = useControllableState({
    defaultProp: defaultOpen,
    onChange: (value: boolean | undefined) => {
      onOpenChange?.(value ?? false);
    },
    prop: openProp,
  });

  const voiceSelectorContext = useMemo(
    () => ({ open, setOpen, setValue, value }),
    [value, setValue, open, setOpen]
  );

  return (
    <VoiceSelectorContext.Provider value={voiceSelectorContext}>
      <Dialog onOpenChange={setOpen} open={open} {...props}>
        {children}
      </Dialog>
    </VoiceSelectorContext.Provider>
  );
}
