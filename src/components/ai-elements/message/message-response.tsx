"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";
import type { ComponentProps } from "react";

const fullPlugins = { cjk, code, math, mermaid };
const streamingPlugins = { cjk };

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

export const MessageResponse = memo(
  ({ className, isAnimating, ...props }: MessageResponseProps) => {
    // Streaming text updates are frequent; use a lighter plugin set to reduce parse cost.
    const plugins = useMemo(
      () => (isAnimating ? streamingPlugins : fullPlugins),
      [isAnimating]
    );

    return (
      <Streamdown
        className={cn(
          "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        plugins={plugins}
        isAnimating={isAnimating}
        {...props}
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children
    && nextProps.isAnimating === prevProps.isAnimating
);

MessageResponse.displayName = "MessageResponse";
