"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { getUsage } from "tokenlens";

import { useContextValue } from "./context";
import { TokensWithCost } from "./tokens-with-cost";

export type ContextCacheUsageProps = ComponentProps<"div">;

export async function ContextCacheUsage({
  className,
  children,
  ...props
}: ContextCacheUsageProps) {
  const { usage, modelId } = useContextValue();
  const cacheTokens = usage?.cachedInputTokens ?? 0;

  if (children) {
    return children;
  }

  if (!cacheTokens) {
    return null;
  }

  const cacheCost = modelId
    ? getUsage({
      modelId,
      usage: { cacheReads: cacheTokens, input: 0, output: 0 },
    }).costUSD?.totalUSD
    : undefined;
  const cacheCostText = new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(cacheCost ?? 0);

  return (
    <div
      className={cn("flex items-center justify-between text-xs", className)}
      {...props}
    >
      <span className="text-muted-foreground">Cache</span>
      <TokensWithCost costText={cacheCostText} tokens={cacheTokens} />
    </div>
  );
}
