"use client";

import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { ComponentProps } from "react";

export type OpenInSeparatorProps = ComponentProps<typeof DropdownMenuSeparator>;

export function OpenInSeparator(props: OpenInSeparatorProps) {
  return <DropdownMenuSeparator {...props} />;
}
