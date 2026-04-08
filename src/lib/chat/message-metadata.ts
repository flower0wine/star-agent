import type { LanguageModelUsage, UIMessage } from "ai";
import dayjs from "dayjs";

export interface ChatMessageTiming {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ChatMessageMetadata {
  totalUsage?: LanguageModelUsage;
  timing?: ChatMessageTiming;
}

export type ChatUIMessage = UIMessage<ChatMessageMetadata>;

interface BuildChatMessageMetadataOptions {
  totalUsage?: LanguageModelUsage;
  startedAt: string;
  finishedAt: string;
}

export function buildChatMessageMetadata(
  options: BuildChatMessageMetadataOptions,
): ChatMessageMetadata {
  const { totalUsage, startedAt, finishedAt } = options;
  const durationMs = Math.max(
    0,
    dayjs(finishedAt).valueOf() - dayjs(startedAt).valueOf(),
  );

  return {
    totalUsage,
    timing: {
      startedAt,
      finishedAt,
      durationMs,
    },
  };
}
