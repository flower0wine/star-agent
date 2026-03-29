/**
 * New Chat View Component
 *
 * 新对话入口组件，用于 /chat 页面
 * 只负责：展示输入界面、创建会话、跳转到 /chat/[conversationId]
 * 不处理任何消息发送逻辑
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { useStarContext } from "@/hooks/use-star-context";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import { usePendingMessageStore } from "@/stores/pending-message-store";

import {
  ChatLayout,
  ChatInputArea,
  EmptyState,
  SuggestionList,
} from "@/components/chat";
import type { SuggestionItem } from "@/components/chat";

import { AgentSelector } from "@/components/agents/agent-selector";
import type { AgentId } from "@/components/agents/agent-selector";
import { StarLogin } from "@/components/star/star-login";

const SUGGESTIONS: Record<AgentId, SuggestionItem[]> = {
  star: [
    { text: "展示我收藏最多 star 的仓库" },
    { text: "我主要使用什么编程语言？" },
    { text: "查找没有 README 的仓库" },
  ],
  master: [
    { text: "展示所有的 AI 语音项目" },
    { text: "查找最近更新的仓库" },
    { text: "分析仓库的技术栈分布" },
  ],
};

export function NewChatView() {
  const router = useRouter();

  // Agent selection
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("star");
  const [isCreating, setIsCreating] = useState(false);

  // Star context (auth + repos)
  const {
    username,
    isVerified,
    isLoading: isAuthLoading,
    error: authError,
    login,
  } = useStarContext();

  // Chat input state
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;

  // Stores
  const { setPendingMessage } = usePendingMessageStore();
  const { createNewConversation, selectConversation } = useChatHistoryStore();

  // Handlers
  const handleAgentSelect = useCallback((id: string) => {
    setSelectedAgent(id as AgentId);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSuggestionSelect = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text || isCreating)
      return;

    setIsCreating(true);
    setInput("");

    try {
      // 创建新对话
      const conversation = await createNewConversation(selectedAgent, username);
      selectConversation(conversation.id);

      // 存储待发送的消息
      setPendingMessage({
        conversationId: conversation.id,
        text,
        agentId: selectedAgent,
      });

      // 跳转到对话页面
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setInput(text); // 恢复输入
      setIsCreating(false);
    }
  }, [isCreating, createNewConversation, selectedAgent, username, setPendingMessage, router, selectConversation]);

  // Login page for unauthenticated users
  if ((selectedAgent === "star" || selectedAgent === "master") && !isVerified) {
    return (
      <ChatLayout showBackground>
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <AgentSelector
            selectedAgentId={selectedAgent}
            onSelect={handleAgentSelect}
            className="mb-8"
          />
          <StarLogin
            onSubmit={login}
            error={authError}
            isLoading={isAuthLoading}
          />
        </div>
      </ChatLayout>
    );
  }

  // Current suggestions based on agent
  const suggestions = SUGGESTIONS[selectedAgent] || [];

  return (
    <ChatLayout
      showBackground
      header={(
        <div className="flex items-center justify-center py-4">
          <AgentSelector
            selectedAgentId={selectedAgent}
            onSelect={handleAgentSelect}
          />
        </div>
      )}
      footer={(
        <ChatInputArea
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isCreating}
          placeholder={selectedAgent === "star" ? "询问关于你的仓库..." : "输入消息..."}
        />
      )}
    >
      <div className="flex-1 flex flex-col min-w-0 pb-[100px]">
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title={`欢迎回来，@${username}`}
            description="有什么我可以帮助你的？你可以询问关于你 Star 仓库的任何问题。"
          >
            <SuggestionList
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              title="试试这些问题"
            />
          </EmptyState>
        </div>
      </div>
    </ChatLayout>
  );
}
