"use client";

import {
  HoverCard,
} from "@/components/ui/hover-card";
import type { ComponentProps } from "react";

import type { ContextSchema } from "./types";
import { ContextProvider } from "./context";

export type ContextProps = ComponentProps<typeof HoverCard> & ContextSchema;

export function Context({
  usedTokens,
  maxTokens,
  usage,
  modelId,
  ...props
}: ContextProps) {
  return (
    <ContextProvider value={{ maxTokens, modelId, usage, usedTokens }}>
      <HoverCard closeDelay={0} openDelay={0} {...props} />
    </ContextProvider>
  );
}

// Re-export all components
export { ContextProvider, useContextValue } from "./context";
export { ContextCacheUsage } from "./context-cache-usage";
// Re-export component props from individual component files
export type { ContextCacheUsageProps } from "./context-cache-usage";
export { ContextContent } from "./context-content";
export type { ContextContentProps } from "./context-content";
export { ContextContentBody } from "./context-content-body";
export type { ContextContentBodyProps } from "./context-content-body";
export { ContextContentFooter } from "./context-content-footer";
export type { ContextContentFooterProps } from "./context-content-footer";
export { ContextContentHeader } from "./context-content-header";
export type { ContextContentHeaderProps } from "./context-content-header";
export { ContextIcon } from "./context-icon";

export { ContextInputUsage } from "./context-input-usage";

export type { ContextInputUsageProps } from "./context-input-usage";
export { ContextOutputUsage } from "./context-output-usage";
export type { ContextOutputUsageProps } from "./context-output-usage";
export { ContextReasoningUsage } from "./context-reasoning-usage";
export type { ContextReasoningUsageProps } from "./context-reasoning-usage";
export { ContextTrigger } from "./context-trigger";
export type { ContextTriggerProps } from "./context-trigger";
export { TokensWithCost } from "./tokens-with-cost";
// Re-export types
export type {
  ContextSchema,
  ModelId,
} from "./types";
