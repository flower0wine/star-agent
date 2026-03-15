"use client";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExternalLinkIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useOpenInContext } from "./context";
import { providers } from "./providers";

export type OpenInT3Props = ComponentProps<typeof DropdownMenuItem>;

export function OpenInT3(props: OpenInT3Props) {
  const { query } = useOpenInContext();
  return (
    <DropdownMenuItem asChild {...props}>
      <a
        className="flex items-center gap-2"
        href={providers.t3.createUrl(query)}
        rel="noopener"
        target="_blank"
      >
        <span className="shrink-0">{providers.t3.icon}</span>
        <span className="flex-1">{providers.t3.title}</span>
        <ExternalLinkIcon className="size-4 shrink-0" />
      </a>
    </DropdownMenuItem>
  );
}
