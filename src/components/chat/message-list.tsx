"use client";

import type { Message } from "@/types/storage";
import {
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Message as MessageComponent, MessageContent, MessageResponse, MessageToolbar, MessageActions, MessageAction } from "@/components/ai-elements/message";
import { SparklesIcon } from "lucide-react";
import { useCallback } from "react";

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  if (messages.length === 0 && !isLoading) {
    return (
      <ConversationEmptyState
        title="Welcome to Star Finder"
        description="Ask me about your starred repositories"
        icon={<SparklesIcon className="size-10" />}
      />
    );
  }

  return (
    <ConversationContent>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageComponent key={message.id} from={message.role}>
            <MessageContent>
              {message.role === "assistant" ? (
                <MessageResponse>{message.content}</MessageResponse>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </MessageContent>

            {message.role === "assistant" && (
              <MessageToolbar>
                <MessageActions>
                  <MessageAction
                    tooltip="Copy"
                    onClick={() => copyToClipboard(message.content)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </MessageAction>
                </MessageActions>
              </MessageToolbar>
            )}
          </MessageComponent>
        ))}
      </div>
    </ConversationContent>
  );
}
