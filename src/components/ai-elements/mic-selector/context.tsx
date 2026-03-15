"use client";

import { createContext } from "react";

import type { MicSelectorContextType } from "./types";

export const MicSelectorContext = createContext<MicSelectorContextType>({
  data: [],
  onOpenChange: undefined,
  onValueChange: undefined,
  open: false,
  setWidth: undefined,
  value: undefined,
  width: 200,
});
