"use client";

import { useConversationStore } from "@/stores/conversation-store";
import type { Message } from "@/types/storage";
import { Conversation } from "@/components/ai-elements/conversation";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { MessageList } from "./message-list";

export interface ChatPanelProps {
  conversationId: string;
  onSendMessage?: (message: string) => void;
  onStopGeneration: () => void;
  onClearChat: () => void;
}

export function ChatPanel({
  conversationId,
  onSendMessage,
  onStopGeneration,
  onClearChat,
}: ChatPanelProps) {
  const currentConversation = useConversationStore(
    (state) => state.currentConversation
  );

  const messages = currentConversation?.messages ?? [];

  return (
    <div className="flex h-full flex-col">
      <ChatHeader
        conversationId={conversationId}
        title={currentConversation?.title ?? "New Chat"}
        onClearChat={onClearChat}
      />

      <Conversation className="flex-1">
        <MessageList messages={messages} />
      </Conversation>

      <ChatInput onSendMessage={onSendMessage} onStopGeneration={onStopGeneration} />
    </div>
  );
}
