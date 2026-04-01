"use client";

import dayjs from "dayjs";
import { Clock3Icon, ZapIcon } from "lucide-react";
import type { LanguageModelUsage } from "ai";
import type { ChatMessageTiming } from "@/lib/chat/message-metadata";

interface ChatMessageMetricsProps {
  usage?: LanguageModelUsage;
  timing?: ChatMessageTiming;
}

function formatDuration(durationMs: number) {
  return durationMs < 1000
    ? `${durationMs}ms`
    : `${(durationMs / 1000).toFixed(1)}s`;
}

export function ChatMessageMetrics({ usage, timing }: ChatMessageMetricsProps) {
  if (!usage && !timing) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {usage && (
        <div className="flex items-center gap-1.5">
          <ZapIcon className="size-3.5" />
          <span className="font-medium text-foreground">
            {usage.totalTokens}
          </span>
          <span>
            tokens (in: {usage.inputTokens || 0}, out: {usage.outputTokens || 0})
          </span>
        </div>
      )}

      {timing && (
        <div className="flex items-center gap-1.5">
          <Clock3Icon className="size-3.5" />
          <span>{formatDuration(timing.durationMs)}</span>
          <span className="text-muted-foreground/80">
            @ {dayjs(timing.finishedAt).format("HH:mm:ss")}
          </span>
        </div>
      )}
    </div>
  );
}
