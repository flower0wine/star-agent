"use client";

import { useContext } from "react";

import { CommandList } from "@/components/ui/command";
import type { ReactNode } from "react";

import { MicSelectorContext } from "./context";
import type { MicSelectorListProps } from "./types";

export function MicSelectorList({
  children,
  ...props
}: MicSelectorListProps) {
  const { data } = useContext(MicSelectorContext);

  return <CommandList {...props}>{children(data)}</CommandList>;
}
