"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExternalLinkIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useOpenInContext } from "./context";
import { providers } from "./providers";

export type OpenInv0Props = ComponentProps<typeof DropdownMenuItem>;

export function OpenInv0(props: OpenInv0Props) {
  const { query } = useOpenInContext();
  return (
    <DropdownMenuItem asChild {...props}>
      <a
        className="flex items-center gap-2"
        href={providers.v0.createUrl(query)}
        rel="noopener"
        target="_blank"
      >
        <span className="shrink-0">{providers.v0.icon}</span>
        <span className="flex-1">{providers.v0.title}</span>
        <ExternalLinkIcon className="size-4 shrink-0" />
      </a>
    </DropdownMenuItem>
  );
}
