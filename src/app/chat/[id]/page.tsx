"use client";

import { useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { useConversationStore } from "@/stores/conversation-store";
import { useChat } from "@/hooks/use-chat";
import { ChatPanel } from "@/components/chat/chat-panel";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const {
    sendMessage,
    clearChat,
    stopGeneration,
    isLoading,
    isStreaming,
  } = useChat({
    conversationId,
  });

  const hydrate = useConversationStore((state) => state.hydrate);
  const isHydrated = useConversationStore((state) => state.isHydrated);

  // Hydrate on mount
  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [hydrate, isHydrated]);

  // Handle send message
  const handleSendMessage = useCallback(
    async (message: string) => {
      await sendMessage(message);
    },
    [sendMessage]
  );

  // Handle clear chat
  const handleClearChat = useCallback(async () => {
    await clearChat();
    router.push("/");
  }, [clearChat, router]);

  // Handle stop generation
  const handleStopGeneration = useCallback(() => {
    stopGeneration();
  }, [stopGeneration]);

  if (!isHydrated) {
    return (
      <TooltipProvider delayDuration={0}>
        <MainLayout sidebar={<Sidebar />}>
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </MainLayout>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <MainLayout sidebar={<Sidebar />}>
        <ChatPanel
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onClearChat={handleClearChat}
        />
      </MainLayout>
    </TooltipProvider>
  );
}
