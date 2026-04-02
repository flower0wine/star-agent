/**
 * Chat View Component
 *
 * 聊天视图组件，统一支持：
 * - 新对话（不传 conversationId）
 * - 已有对话（传入 conversationId）
 */

"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { ChatOnDataCallback, UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Loader2Icon } from "lucide-react";
import {
  buildSubAgentHistoryState,
  createSubAgentHistorySignature,
} from "@/lib/chat/sub-agent-history";

import { useAgentChat } from "@/hooks/use-agent-chat";
import { useSubAgentMessages } from "@/hooks/use-sub-agent-messages";
import { useStarContext } from "@/hooks/use-star-context";
import { useSettingsStore } from "@/stores/settings-store";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import type { ChatMessageMetadata } from "@/lib/chat/message-metadata";

import {
  ChatLayout,
  ChatHeader,
  ChatInputArea,
  EmptyState,
  ChatError,
  ChatMessageWrapper,
  SuggestionList,
  ChatModelPicker,
} from "@/components/chat";
import type { SuggestionItem } from "@/components/chat";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  MessageRenderer,
  MessageLoadingIndicator,
  StarLogin,
} from "@/components/agents/star";
import { SubAgentPanel } from "@/components/agents/master";
import { AgentSelector } from "@/components/agents/agent-selector";
import type { AgentId } from "@/components/agents/agent-selector";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface SubAgentProgressData {
  taskId: string;
  task?: string;
  progressType?: string;
  chunk?: unknown;
  error?: string;
  result?: string;
  progress?: number;
}

interface OpenSubAgentPanelPayload {
  taskId: string;
  task?: string;
}

interface PendingRouteMessagePayload {
  conversationId: string;
  text: string;
}

const PendingRouteMessageStorageKey = "star-agent:pending-route-message";

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

interface ChatViewProps {
  /** 会话 ID（可选，不传表示新对话） */
  conversationId?: string;
  /** 初始 Agent ID，从会话元数据获取 */
  initialAgentId?: AgentId;
  /** 是否显示模型选择器 */
  showModelPicker?: boolean;
}

export function ChatView({
  conversationId,
  initialAgentId = "star",
  showModelPicker = true,
}: ChatViewProps) {
  const router = useRouter();
  const { createNewConversation } = useChatHistoryStore();

  // Agent selection - 使用初始值，但允许用户切换
  const [selectedAgent, setSelectedAgent] = useState<AgentId>(initialAgentId);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // 当 initialAgentId 变化时同步（例如从 URL 加载新会话）
  useEffect(() => {
    setSelectedAgent(initialAgentId);
  }, [initialAgentId]);

  const { defaultProviderId, defaultModelId, providerApiKeys } = useSettingsStore();
  const selectedProviderApiKey = defaultProviderId ? providerApiKeys[defaultProviderId] : undefined;

  // Star context (auth + repos)
  const {
    username,
    repos,
    isVerified,
    isRestoring,
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
    upsertSubAgentCard,
    hydrateFromHistory,
    reset: resetSubAgentMessages,
    removeSubAgent,
  } = useSubAgentMessages();

  // Chat input state
  const [input, setInput] = useState("");
  const [isSubAgentPanelOpen, setIsSubAgentPanelOpen] = useState(false);
  const [activeSubAgentTaskId, setActiveSubAgentTaskId] = useState<string | undefined>(undefined);
  const subAgentCardsRef = useRef(subAgentCards);
  const isCreatingConversationRef = useRef(false);
  const autoSentConversationIdRef = useRef<string | null>(null);

  // Handler for custom data parts (sub-agent progress)
  const handleData: ChatOnDataCallback<UIMessage<ChatMessageMetadata>> = useCallback(
    (dataPart) => {
      if (dataPart.type !== "data-subagent")
        return;

      const subData = dataPart.data as SubAgentProgressData;
      const { taskId, task, progressType, chunk, error, result, progress } = subData;
      if (!taskId)
        return;

      if (selectedAgent === "master") {
        setIsSubAgentPanelOpen(true);
        setActiveSubAgentTaskId((prev) => prev || taskId);
      }

      if (task) {
        upsertSubAgentCard(taskId, { task });
      }

      if (progressType === "message-chunk" && chunk) {
        processChunk(taskId, chunk);
      } else {
        handleProgress(taskId, progressType || "progress", progress, result, error);
      }
    },
    [processChunk, handleProgress, selectedAgent, upsertSubAgentCard]
  );

  // Chat hook with persistence - only active when we have a conversationId
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
    conversationId: conversationId || null,
    username,
    modelConfig: defaultProviderId && defaultModelId
      ? {
          providerId: defaultProviderId,
          modelId: defaultModelId,
          apiKey: selectedProviderApiKey,
        }
      : undefined,
  });

  const isChatLoading = status === "submitted" || status === "streaming";
  const isInputBusy = isChatLoading || isCreatingConversation;
  const subAgentHistorySignature = useMemo(
    () => createSubAgentHistorySignature(messages),
    [messages]
  );
  const lastHydratedHistoryRef = useRef<string | null>(null);

  useEffect(() => {
    subAgentCardsRef.current = subAgentCards;
  }, [subAgentCards]);

  // 会话切换时重置子 Agent UI 状态，避免污染到其他会话
  useEffect(() => {
    resetSubAgentMessages();
    setIsSubAgentPanelOpen(false);
    setActiveSubAgentTaskId(undefined);
  }, [conversationId, resetSubAgentMessages]);

  // 根据历史消息重建子 Agent 状态（修复旧会话一直 running）
  useEffect(() => {
    if (selectedAgent !== "master") {
      setIsSubAgentPanelOpen(false);
      setActiveSubAgentTaskId(undefined);
      lastHydratedHistoryRef.current = null;
      return;
    }
    if (isLoadingMessages || isChatLoading) {
      return;
    }
    if (lastHydratedHistoryRef.current === subAgentHistorySignature) {
      return;
    }
    lastHydratedHistoryRef.current = subAgentHistorySignature;

    const { cards: hydratedCards, messages: restoredMessages } = buildSubAgentHistoryState(messages, {
      isChatLoading,
    });

    hydrateFromHistory({
      cards: hydratedCards,
      messages: restoredMessages,
    });

    setIsSubAgentPanelOpen(hydratedCards.size > 0);
    if (hydratedCards.size === 0) {
      setActiveSubAgentTaskId(undefined);
      return;
    }
    const availableTaskIds = new Set(hydratedCards.keys());
    setActiveSubAgentTaskId((prev) => {
      if (prev && availableTaskIds.has(prev)) {
        return prev;
      }
      return [...availableTaskIds][0];
    });
  }, [
    messages,
    selectedAgent,
    isLoadingMessages,
    isChatLoading,
    hydrateFromHistory,
    subAgentHistorySignature,
  ]);

  // Input ref for submit handler
  const inputRef = useRef(input);
  inputRef.current = input;

  // Handlers
  useEffect(() => {
    if (!conversationId || isLoadingMessages || isInputBusy || status !== "ready") {
      return;
    }

    if ((selectedAgent === "star" || selectedAgent === "master") && (isRestoring || !isVerified)) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const rawPayload = window.sessionStorage.getItem(PendingRouteMessageStorageKey);
    if (!rawPayload) {
      return;
    }

    let payload: PendingRouteMessagePayload | null = null;
    try {
      payload = JSON.parse(rawPayload) as PendingRouteMessagePayload;
    } catch (err) {
      console.error("Failed to parse pending route message:", err);
      window.sessionStorage.removeItem(PendingRouteMessageStorageKey);
      return;
    }

    if (!payload?.text || payload.conversationId !== conversationId) {
      return;
    }

    if (autoSentConversationIdRef.current === conversationId) {
      return;
    }

    autoSentConversationIdRef.current = conversationId;
    window.sessionStorage.removeItem(PendingRouteMessageStorageKey);

    void sendMessage({ text: payload.text.trim() }).catch((err) => {
      console.error("Failed to send pending route message:", err);
      autoSentConversationIdRef.current = null;
      window.sessionStorage.setItem(PendingRouteMessageStorageKey, JSON.stringify(payload));
    });
  }, [
    conversationId,
    isLoadingMessages,
    isInputBusy,
    status,
    selectedAgent,
    isRestoring,
    isVerified,
    sendMessage,
  ]);

  const handleAgentClose = useCallback((taskId: string) => {
    removeSubAgent(taskId);
    if (activeSubAgentTaskId === taskId) {
      setActiveSubAgentTaskId(undefined);
    }
  }, [removeSubAgent, activeSubAgentTaskId]);

  const handleOpenSubAgentPanel = useCallback((payload: OpenSubAgentPanelPayload) => {
    const { taskId, task } = payload;
    if (!taskId)
      return;
    setIsSubAgentPanelOpen(true);
    setActiveSubAgentTaskId(taskId);
    if (task) {
      upsertSubAgentCard(taskId, {
        task,
      });
    }
    if (!subAgentCardsRef.current.has(taskId)) {
      handleProgress(taskId, "start", 0);
    }
  }, [handleProgress, upsertSubAgentCard]);

  const handleLogout = useCallback(() => {
    logout();
    setInput("");
    resetSubAgentMessages();
  }, [logout, resetSubAgentMessages]);

  const handleSubmit = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text || isInputBusy || isLoadingMessages)
      return;

    setInput("");

    if (!conversationId) {
      if (isCreatingConversationRef.current) {
        return;
      }

      isCreatingConversationRef.current = true;
      setIsCreatingConversation(true);

      try {
        const conversation = await createNewConversation(selectedAgent, username || null);
        if (typeof window !== "undefined") {
          const payload: PendingRouteMessagePayload = {
            conversationId: conversation.id,
            text,
          };
          window.sessionStorage.setItem(PendingRouteMessageStorageKey, JSON.stringify(payload));
        }
        router.push(`/chat/${conversation.id}`);
      } catch (err) {
        console.error("Failed to create conversation before sending:", err);
        setInput(text);
      } finally {
        isCreatingConversationRef.current = false;
        setIsCreatingConversation(false);
      }
      return;
    }

    await sendMessage({ text });
  }, [
    isInputBusy,
    isLoadingMessages,
    conversationId,
    createNewConversation,
    selectedAgent,
    username,
    router,
    sendMessage,
  ]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSuggestionSelect = useCallback((text: string) => {
    setInput(text);
  }, []);

  const handleAgentSelect = useCallback((id: string) => {
    setSelectedAgent(id as AgentId);
  }, []);

  // Current suggestions based on agent
  const suggestions = SUGGESTIONS[selectedAgent] || [];

  const chatInputArea = (
    <ChatInputArea
      value={input}
      onChange={handleInputChange}
      onSubmit={handleSubmit}
      onStop={stop}
      isLoading={isInputBusy}
      placeholder={selectedAgent === "star" ? "询问关于你的仓库..." : "输入消息..."}
    />
  );

  const chatMessages = useMemo(() => (
    <>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          <AnimatePresence initial={false}>
            {messages.length === 0 && !isLoadingMessages ? (
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
                      onOpenSubAgentPanel={handleOpenSubAgentPanel}
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
  ), [
    messages,
    isLoadingMessages,
    username,
    suggestions,
    handleSuggestionSelect,
    chatError,
    isChatLoading,
    regenerate,
    handleOpenSubAgentPanel,
  ]);

  // Auth restoring state (avoid login flash)
  if ((selectedAgent === "star" || selectedAgent === "master") && isRestoring) {
    return (
      <ChatLayout showBackground>
        <div className="flex flex-1 items-center justify-center">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      </ChatLayout>
    );
  }

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
          rightSlot={showModelPicker ? <ChatModelPicker /> : undefined}
          username={username}
          showLogout
          onLogout={handleLogout}
        />
      )}
    >
      {selectedAgent === "master" && isSubAgentPanelOpen && subAgentCards.size > 0 ? (
        <ResizablePanelGroup className="flex-1">
          <ResizablePanel defaultSize="50%" minSize="35%" maxSize="65%">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-auto">{chatMessages}</div>
              {chatInputArea}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="50%">
            <SubAgentPanel
              agents={subAgentCards}
              messages={subAgentMessages}
              masterMessages={messages}
              activeTaskId={activeSubAgentTaskId}
              onActiveTaskChange={setActiveSubAgentTaskId}
              onAgentClose={handleAgentClose}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex h-full w-full flex-col min-w-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">{chatMessages}</div>
          {chatInputArea}
        </div>
      )}
    </ChatLayout>
  );
}

