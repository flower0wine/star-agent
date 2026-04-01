import type { LanguageModelUsage, UIMessage } from "ai";

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
  options: BuildChatMessageMetadataOptions
): ChatMessageMetadata {
  const { totalUsage, startedAt, finishedAt } = options;
  const durationMs = Math.max(
    0,
    new Date(finishedAt).getTime() - new Date(startedAt).getTime()
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
