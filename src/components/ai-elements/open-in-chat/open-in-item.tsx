"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ComponentProps } from "react";

export type OpenInItemProps = ComponentProps<typeof DropdownMenuItem>;

export function OpenInItem(props: OpenInItemProps) {
  return <DropdownMenuItem {...props} />;
}
