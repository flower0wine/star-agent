"use client";

import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import { OpenInContext } from "./context";

export type OpenInProps = ComponentProps<typeof DropdownMenu> & {
  query: string;
};

export function OpenIn({ query, ...props }: OpenInProps) {
  const contextValue = useMemo(() => ({ query }), [query]);

  return (
    <OpenInContext.Provider value={contextValue}>
      <DropdownMenu {...props} />
    </OpenInContext.Provider>
  );
}
