import type { LanguageModelUsage } from "ai";

function toNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function emptyUsage(): LanguageModelUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputTokenDetails: {
      noCacheTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: {
      textTokens: 0,
      reasoningTokens: 0,
    },
    reasoningTokens: 0,
    cachedInputTokens: 0,
  };
}

export function addUsage(
  left: LanguageModelUsage,
  right?: LanguageModelUsage
): LanguageModelUsage {
  if (!right) {
    return left;
  }

  const next = emptyUsage();
  next.inputTokens = toNumber(left.inputTokens) + toNumber(right.inputTokens);
  next.outputTokens = toNumber(left.outputTokens) + toNumber(right.outputTokens);
  next.totalTokens = toNumber(left.totalTokens) + toNumber(right.totalTokens);

  next.inputTokenDetails.noCacheTokens
    = toNumber(left.inputTokenDetails?.noCacheTokens) + toNumber(right.inputTokenDetails?.noCacheTokens);
  next.inputTokenDetails.cacheReadTokens
    = toNumber(left.inputTokenDetails?.cacheReadTokens) + toNumber(right.inputTokenDetails?.cacheReadTokens);
  next.inputTokenDetails.cacheWriteTokens
    = toNumber(left.inputTokenDetails?.cacheWriteTokens) + toNumber(right.inputTokenDetails?.cacheWriteTokens);

  next.outputTokenDetails.textTokens
    = toNumber(left.outputTokenDetails?.textTokens) + toNumber(right.outputTokenDetails?.textTokens);
  next.outputTokenDetails.reasoningTokens
    = toNumber(left.outputTokenDetails?.reasoningTokens) + toNumber(right.outputTokenDetails?.reasoningTokens);

  next.reasoningTokens
    = toNumber(left.reasoningTokens) + toNumber(right.reasoningTokens);
  next.cachedInputTokens
    = toNumber(left.cachedInputTokens) + toNumber(right.cachedInputTokens);

  return next;
}

export function sumUsage(
  usages: Array<LanguageModelUsage | undefined>
): LanguageModelUsage {
  return usages.reduce((acc, usage) => addUsage(acc, usage), emptyUsage());
}

export function formatTokens(tokens: number | undefined): string {
  const value = toNumber(tokens);
  return new Intl.NumberFormat("en-US").format(value);
}

