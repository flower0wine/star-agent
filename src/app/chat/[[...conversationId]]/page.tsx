/**
 * Chat Page (Optional Catch-All Conversation Route)
 *
 * 统一承载：
 * - /chat：新对话
 * - /chat/[conversationId]：已有对话
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { getConversation } from "@/lib/storage";
import type { ChatConversation } from "@/lib/storage";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import type { AgentId } from "@/components/agents/agent-selector";
import { ChatView } from "@/components/chat/chat-view";

export default function ChatPage() {
  const params = useParams<{ conversationId?: string[] }>();
  const router = useRouter();
  const conversationId = params.conversationId?.[0];

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);

  const { selectConversation } = useChatHistoryStore();

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setError(null);
      setIsLoading(false);
      selectConversation(null);
      return;
    }

    const loadConversation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const conv = await getConversation(conversationId);
        if (!conv) {
          setConversation(null);
          setError("会话不存在");
          return;
        }

        setConversation(conv);
        selectConversation(conversationId);
      } catch (err) {
        console.error("Failed to load conversation:", err);
        setConversation(null);
        setError("加载会话失败");
      } finally {
        setIsLoading(false);
      }
    };

    void loadConversation();
  }, [conversationId, selectConversation]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => router.push("/chat")}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          返回新建对话
        </button>
      </div>
    );
  }

  return (
    <ChatView
      conversationId={conversationId}
      initialAgentId={(conversation?.agentId as AgentId) || "star"}
    />
  );
}
