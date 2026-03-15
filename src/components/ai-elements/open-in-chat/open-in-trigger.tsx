"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";

export type OpenInTriggerProps = ComponentProps<typeof DropdownMenuTrigger>;

export function OpenInTrigger({ children, ...props }: OpenInTriggerProps) {
  return (
    <DropdownMenuTrigger {...props} asChild>
      {children ?? (
        <Button type="button" variant="outline">
          Open in chat
          <ChevronDownIcon className="size-4" />
        </Button>
      )}
    </DropdownMenuTrigger>
  );
}
