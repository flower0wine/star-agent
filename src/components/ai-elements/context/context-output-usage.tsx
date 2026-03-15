"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { getUsage } from "tokenlens";

import { useContextValue } from "./context";
import { TokensWithCost } from "./tokens-with-cost";

export type ContextOutputUsageProps = ComponentProps<"div">;

export async function ContextOutputUsage({
  className,
  children,
  ...props
}: ContextOutputUsageProps) {
  const { usage, modelId } = useContextValue();
  const outputTokens = usage?.outputTokens ?? 0;

  if (children) {
    return children;
  }

  if (!outputTokens) {
    return null;
  }

  const outputCost = modelId
    ? getUsage({
      modelId,
      usage: { input: 0, output: outputTokens },
    }).costUSD?.totalUSD
    : undefined;
  const outputCostText = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(outputCost ?? 0);

  return (
    <div
      className={cn("flex items-center justify-between text-xs", className)}
      {...props}
    >
      <span className="text-muted-foreground">Output</span>
      <TokensWithCost costText={outputCostText} tokens={outputTokens} />
    </div>
  );
}
