/**
 * Chat Page
 *
 * 聊天页面 - 支持多 Agent 的对话界面
 * 重构后采用模块化组件架构，提升可维护性
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatOnDataCallback, UIMessage } from "ai";
import { motion, AnimatePresence } from "motion/react";

import { useAgentChat } from "@/hooks/use-agent-chat";
import { useSubAgentMessages } from "@/hooks/use-sub-agent-messages";
import { useStarContext } from "@/hooks/use-star-context";
import { useChatHistoryStore } from "@/stores/chat-history-store";

// Layout components
import {
  ChatLayout,
  ChatHeader,
  ChatInputArea,
  EmptyState,
  ChatError,
  ChatMessageWrapper,
  SuggestionList,
} from "@/components/chat";
import type { SuggestionItem } from "@/components/chat";

// Feature components
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { MessageRenderer, MessageLoadingIndicator } from "@/components/star";
import { SubAgentPanel } from "@/components/star/sub-agent-panel";
import { AgentSelector } from "@/components/agents/agent-selector";
import type { AgentId } from "@/components/agents/agent-selector";
import { StarLogin } from "@/components/star/star-login";

// UI components
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatBackground } from "@/components/chat/layout";

// Sub-agent progress data type
interface SubAgentProgressData {
  taskId: string;
  progressType?: string;
  chunk?: unknown;
  error?: string;
  result?: string;
  progress?: number;
}

// Suggested questions configuration
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

export default function ChatPage() {
  // Agent selection
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("star");

  // Star context (auth + repos)
  const {
    username,
    repos,
    isVerified,
    isLoading: isAuthLoading,
    error: authError,
    login,
    logout,
  } = useStarContext();

  // Sub-agent messages state (for Master Agent)
  const {
    subAgentMessages,
    subAgentCards,
    processChunk,
    handleProgress,
    reset: resetSubAgentMessages,
    removeSubAgent,
  } = useSubAgentMessages();

  // Chat input state
  const [input, setInput] = useState("");

  // Handler for custom data parts (sub-agent progress)
  const handleData: ChatOnDataCallback<UIMessage<{ totalUsage: unknown }>> = useCallback(
    (dataPart) => {
      if (dataPart.type !== "data-subagent")
        return;

      const subData = dataPart.data as SubAgentProgressData;
      const { taskId, progressType, chunk, error, result, progress } = subData;
      if (!taskId)
        return;

      if (progressType === "message-chunk" && chunk) {
        processChunk(taskId, chunk);
      } else {
        handleProgress(taskId, progressType || "progress", progress, result, error);
      }
    },
    [processChunk, handleProgress]
  );

  // Conversation history state
  const { currentConversationId } = useChatHistoryStore();

  // Chat hook with persistence
  const {
    messages,
    sendMessage,
    status,
    error: chatError,
    regenerate,
    stop,
    isLoadingMessages,
  } = useAgentChat({
    api: "/api/chat",
    agentId: selectedAgent,
    context: selectedAgent === "star" || selectedAgent === "master" ? { username, repos } : {},
    onData: handleData,
    conversationId: currentConversationId,
    username,
  });

  const isChatLoading = status === "submitted" || status === "streaming";

  // 跟踪已处理的 taskId，避免重复处理
  const processedTaskIdsRef = useRef<Set<string>>(new Set());

  // Extract sub-agent task IDs from messages (for Master Agent)
  // 优化: 使用增量检测，只处理新消息，避免流式传输时频繁执行
  useEffect(() => {
    if (selectedAgent !== "master") {
      resetSubAgentMessages();
      processedTaskIdsRef.current.clear();
      return;
    }

    // 只检查最后一条消息，避免 O(n×m) 遍历
    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant")
      return;

    lastMessage.parts.forEach((part: unknown) => {
      if (!part || typeof part !== "object")
        return;

      const p = part as Record<string, unknown>;
      if (p.type === "tool-result" && p.toolCallId && p.result && typeof p.result === "object") {
        const result = p.result as Record<string, unknown>;
        if (
          result.taskId
          && typeof result.taskId === "string"
          && result.taskId.startsWith("subagent-")
          && !processedTaskIdsRef.current.has(result.taskId)
        ) {
          processedTaskIdsRef.current.add(result.taskId);
          handleProgress(result.taskId, "start", 0);
        }
      }
    });
  }, [messages.length, selectedAgent, handleProgress, resetSubAgentMessages]);

  // Input ref for submit handler
  const inputRef = useRef(input);
  inputRef.current = input;

  // Handlers
  const handleAgentClose = useCallback((taskId: string) => {
    removeSubAgent(taskId);
  }, [removeSubAgent]);

  const handleLogout = useCallback(() => {
    logout();
    setInput("");
    resetSubAgentMessages();
  }, [logout, resetSubAgentMessages]);

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text || isChatLoading)
      return;

    setInput("");
    await sendMessage({ text });
  }, [isChatLoading, sendMessage]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSuggestionSelect = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleAgentSelect = useCallback((id: string) => {
    setSelectedAgent(id as AgentId);
  }, []);

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

  const chatInputArea = (
    <ChatInputArea
      value={input}
      onChange={handleInputChange}
      onSubmit={handleSubmit}
      onStop={stop}
      isLoading={isChatLoading}
      placeholder={selectedAgent === "star" ? "询问关于你的仓库..." : "输入消息..."}
    />
  );

  const chatMessages = (
    <>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
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
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <ChatMessageWrapper key={message.id} id={message.id} isLast={index === messages.length - 1}>
                    <MessageRenderer
                      message={message}
                      isStreaming={isChatLoading && index === messages.length - 1}
                      isLastMessage={index === messages.length - 1}
                      onReload={index === messages.length - 1 ? regenerate : undefined}
                    />
                  </ChatMessageWrapper>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Error display */}
          {chatError && <ChatError message={chatError.message || String(chatError)} />}

          {/* Loading indicator for new chat */}
          {isChatLoading && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <MessageLoadingIndicator />
            </motion.div>
          )}

          {/* Loading indicator for loading messages from DB */}
          {isLoadingMessages && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-8"
            >
              <div className="text-sm text-muted-foreground">加载对话历史...</div>
            </motion.div>
          )}
        </ConversationContent>
      </Conversation>
    </>
  );

  // Main chat interface
  return (
    <ChatLayout
      showBackground
      header={(
        <ChatHeader
          leftSlot={(
            <AgentSelector
              selectedAgentId={selectedAgent}
              onSelect={handleAgentSelect}
              compact
            />
          )}
          username={username}
          showLogout
          onLogout={handleLogout}
        />
      )}
      footer={chatInputArea}
    >
      {selectedAgent === "master" && subAgentCards.size > 0 ? (
        <ResizablePanelGroup className="flex-1">
          <ResizablePanel defaultSize="50%" minSize="35%" maxSize="65%">
            <div className="flex flex-col h-full pb-[100px]">{chatMessages}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="50%">
            <SubAgentPanel
              agents={subAgentCards}
              messages={subAgentMessages}
              onAgentClose={handleAgentClose}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 flex flex-col min-w-0 pb-[100px]">{chatMessages}</div>
      )}
    </ChatLayout>
  );
}
