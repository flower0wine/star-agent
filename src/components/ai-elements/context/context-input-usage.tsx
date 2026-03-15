"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { getUsage } from "tokenlens";

import { useContextValue } from "./context";
import { TokensWithCost } from "./tokens-with-cost";

export type ContextInputUsageProps = ComponentProps<"div">;

export async function ContextInputUsage({
  className,
  children,
  ...props
}: ContextInputUsageProps) {
  const { usage, modelId } = useContextValue();
  const inputTokens = usage?.inputTokens ?? 0;

  if (children) {
    return children;
  }

  if (!inputTokens) {
    return null;
  }

  const inputCost = modelId
    ? getUsage({
      modelId,
      usage: { input: inputTokens, output: 0 },
    }).costUSD?.totalUSD
    : undefined;
  const inputCostText = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(inputCost ?? 0);

  return (
    <div
      className={cn("flex items-center justify-between text-xs", className)}
      {...props}
    >
      <span className="text-muted-foreground">Input</span>
      <TokensWithCost costText={inputCostText} tokens={inputTokens} />
    </div>
  );
}
