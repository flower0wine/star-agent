"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExternalLinkIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useOpenInContext } from "./context";
import { providers } from "./providers";

export type OpenInSciraProps = ComponentProps<typeof DropdownMenuItem>;

export function OpenInScira(props: OpenInSciraProps) {
  const { query } = useOpenInContext();
  return (
    <DropdownMenuItem asChild {...props}>
      <a
        className="flex items-center gap-2"
        href={providers.scira.createUrl(query)}
        rel="noopener"
        target="_blank"
      >
        <span className="shrink-0">{providers.scira.icon}</span>
        <span className="flex-1">{providers.scira.title}</span>
        <ExternalLinkIcon className="size-4 shrink-0" />
      </a>
    </DropdownMenuItem>
  );
}
