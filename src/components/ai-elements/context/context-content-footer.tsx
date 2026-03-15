"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { getUsage } from "tokenlens";

import { useContextValue } from "./context";

export type ContextContentFooterProps = ComponentProps<"div">;

export function ContextContentFooter({
  children,
  className,
  ...props
}: ContextContentFooterProps) {
  const { modelId, usage } = useContextValue();
  const costUSD = modelId
    ? getUsage({
      modelId,
      usage: {
        input: usage?.inputTokens ?? 0,
        output: usage?.outputTokens ?? 0,
      },
    }).costUSD?.totalUSD
    : undefined;
  const totalCost = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(costUSD ?? 0);

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-3 bg-secondary p-3 text-xs",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="text-muted-foreground">Total cost</span>
          <span>{totalCost}</span>
        </>
      )}
    </div>
  );
}
