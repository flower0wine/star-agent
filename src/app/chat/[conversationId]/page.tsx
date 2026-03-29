/**
 * Conversation Page (Dynamic Route)
 *
 * 显示指定会话 ID 的聊天页面
 * 从 URL 参数获取 conversationId，加载会话元数据以确定 Agent 类型
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

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = params.conversationId;

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { selectConversation } = useChatHistoryStore();

  // 加载会话元数据
  useEffect(() => {
    if (!conversationId) {
      setError("会话 ID 无效");
      setIsLoading(false);
      return;
    }

    const loadConversation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const conv = await getConversation(conversationId);
        if (conv) {
          setConversation(conv);
          // 同步到 store
          selectConversation(conversationId);
        } else {
          setError("会话不存在");
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        setError("加载会话失败");
      } finally {
        setIsLoading(false);
      }
    };

    void loadConversation();
  }, [conversationId, selectConversation]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 错误状态
  if (error || !conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "会话不存在"}</p>
        <button
          onClick={() => router.push("/chat")}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          返回新建对话
        </button>
      </div>
    );
  }

  // 渲染聊天视图
  return (
    <ChatView
      conversationId={conversationId}
      initialAgentId={conversation.agentId as AgentId}
    />
  );
}
