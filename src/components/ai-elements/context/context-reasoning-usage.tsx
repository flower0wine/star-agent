"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { getUsage } from "tokenlens";

import { useContextValue } from "./context";
import { TokensWithCost } from "./tokens-with-cost";

export type ContextReasoningUsageProps = ComponentProps<"div">;

export async function ContextReasoningUsage({
  className,
  children,
  ...props
}: ContextReasoningUsageProps) {
  const { usage, modelId } = useContextValue();
  const reasoningTokens = usage?.reasoningTokens ?? 0;

  if (children) {
    return children;
  }

  if (!reasoningTokens) {
    return null;
  }

  const reasoningCost = modelId
    ? getUsage({
      modelId,
      usage: { reasoningTokens },
    }).costUSD?.totalUSD
    : undefined;
  const reasoningCostText = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(reasoningCost ?? 0);

  return (
    <div
      className={cn("flex items-center justify-between text-xs", className)}
      {...props}
    >
      <span className="text-muted-foreground">Reasoning</span>
      <TokensWithCost costText={reasoningCostText} tokens={reasoningTokens} />
    </div>
  );
}
