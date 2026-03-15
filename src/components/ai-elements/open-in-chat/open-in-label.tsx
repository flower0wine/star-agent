"use client";

import { DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import type { ComponentProps } from "react";

export type OpenInLabelProps = ComponentProps<typeof DropdownMenuLabel>;

export function OpenInLabel(props: OpenInLabelProps) {
  return <DropdownMenuLabel {...props} />;
}
