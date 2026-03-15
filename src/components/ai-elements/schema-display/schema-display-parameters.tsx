"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { useSchemaDisplayContext, SchemaDisplayContext } from "./context";
import { SchemaDisplayParameter } from "./schema-display-parameter";

import { cn } from "@/lib/utils";


export type SchemaDisplayParametersProps = ComponentProps<typeof Collapsible>;

export function SchemaDisplayParameters({
  className,
  children,
  ...props
}: SchemaDisplayParametersProps) {
  const { parameters } = useSchemaDisplayContext(SchemaDisplayContext);

  return (
    <Collapsible className={cn(className)} defaultOpen {...props}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50">
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <span className="font-medium text-sm">Parameters</span>
        <Badge className="ml-auto text-xs" variant="secondary">
          {parameters?.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y border-t">
          {children
            ?? parameters?.map((param) => (
              <SchemaDisplayParameter key={param.name} {...param} />
            ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
