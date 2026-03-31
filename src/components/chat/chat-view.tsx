/**
 * Chat View Component
 *
 * 对话视图组件，用于 /chat/[conversationId] 页面展示已有对话
 * 需要传入有效的 conversationId
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { ChatOnDataCallback, UIMessage } from "ai";
import { motion, AnimatePresence } from "motion/react";
import { Loader2Icon } from "lucide-react";

import { useAgentChat } from "@/hooks/use-agent-chat";
import { useSubAgentMessages } from "@/hooks/use-sub-agent-messages";
import { useStarContext } from "@/hooks/use-star-context";
import { usePendingMessageStore } from "@/stores/pending-message-store";

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
  progressType?: string;
  chunk?: unknown;
  error?: string;
  result?: string;
  progress?: number;
}

interface OpenSubAgentPanelPayload {
  taskId: string;
  task?: string;
  reposCount?: number;
}

interface SubAgentMessageSnapshot {
  taskId: string;
  task: string;
  reposCount: number;
  status: "running" | "completed" | "failed";
}

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
  /** 会话 ID（必须提供有效的 ID） */
  conversationId: string;
  /** 初始 Agent ID，从会话元数据获取 */
  initialAgentId?: AgentId;
}

export function ChatView({ conversationId, initialAgentId = "star" }: ChatViewProps) {
  // Agent selection - 使用初始值，但允许用户切换
  const [selectedAgent, setSelectedAgent] = useState<AgentId>(initialAgentId);

  // 当 initialAgentId 变化时同步（例如从 URL 加载新会话）
  useEffect(() => {
    setSelectedAgent(initialAgentId);
  }, [initialAgentId]);

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
    reset: resetSubAgentMessages,
    removeSubAgent,
  } = useSubAgentMessages();

  // Chat input state
  const [input, setInput] = useState("");
  const [isSubAgentPanelOpen, setIsSubAgentPanelOpen] = useState(false);
  const [activeSubAgentTaskId, setActiveSubAgentTaskId] = useState<string | undefined>(undefined);

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

  // Pending message store for cross-page message passing
  const { consumePendingMessage } = usePendingMessageStore();

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
    conversationId,
    username,
  });

  // 当加载完成后，检查是否有待发送的消息
  const pendingMessageSentRef = useRef(false);
  useEffect(() => {
    if (!conversationId || isLoadingMessages || pendingMessageSentRef.current) {
      return;
    }

    const pendingMessage = consumePendingMessage(conversationId);

    if (pendingMessage) {
      pendingMessageSentRef.current = true;

      sendMessage({ text: pendingMessage.text });
    }
  }, [conversationId, isLoadingMessages, consumePendingMessage, sendMessage, messages.length]);

  const isChatLoading = status === "submitted" || status === "streaming";

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
      return;
    }
    if (isLoadingMessages) {
      return;
    }

    const lastMessageId = messages.at(-1)?.id;
    const nextSnapshots = new Map<string, SubAgentMessageSnapshot>();

    for (const message of messages) {
      if (message.role !== "assistant") {
        continue;
      }
      for (const part of message.parts) {
        if (!part || typeof part !== "object") {
          continue;
        }
        const p = part as Record<string, unknown>;

        // 新格式：tool-createSubAgent
        if (p.type === "tool-createSubAgent") {
          const output = (p.output && typeof p.output === "object")
            ? p.output as Record<string, unknown>
            : undefined;
          const input = (p.input && typeof p.input === "object")
            ? p.input as Record<string, unknown>
            : undefined;
          const taskId = typeof output?.taskId === "string" ? output.taskId : undefined;
          if (!taskId) {
            continue;
          }
          const task = typeof input?.task === "string" ? input.task : "";
          const outputReposCount = typeof output?.reposCount === "number" ? output.reposCount : undefined;
          const startIndex = typeof input?.startIndex === "number" ? input.startIndex : undefined;
          const endIndex = typeof input?.endIndex === "number" ? input.endIndex : undefined;
          const inferredReposCount = outputReposCount ?? (
            typeof startIndex === "number" && typeof endIndex === "number"
              ? Math.max(0, endIndex - startIndex)
              : 0
          );
          const partState = typeof p.state === "string" ? p.state : "";
          const isLastStreamingPart = isChatLoading && message.id === lastMessageId && partState !== "output-error";
          const status: SubAgentMessageSnapshot["status"] = partState === "output-error"
            ? "failed"
            : (isLastStreamingPart ? "running" : "completed");

          nextSnapshots.set(taskId, {
            taskId,
            task,
            reposCount: inferredReposCount,
            status,
          });
          continue;
        }

        // 兼容旧格式：tool-result
        if (p.type === "tool-result" && p.result && typeof p.result === "object") {
          const result = p.result as Record<string, unknown>;
          const taskId = typeof result.taskId === "string" ? result.taskId : undefined;
          if (!taskId || !taskId.startsWith("subagent-")) {
            continue;
          }
          const status: SubAgentMessageSnapshot["status"] = isChatLoading && message.id === lastMessageId
            ? "running"
            : "completed";
          nextSnapshots.set(taskId, {
            taskId,
            task: "",
            reposCount: 0,
            status,
          });
        }
      }
    }

    // 同步到子 Agent 卡片状态
    nextSnapshots.forEach((snapshot) => {
      upsertSubAgentCard(snapshot.taskId, {
        status: snapshot.status,
        task: snapshot.task,
        reposCount: snapshot.reposCount,
        progress: snapshot.status === "running" ? 0 : 100,
      });
    });

    // 非流式状态下，清理不存在于当前消息中的旧任务卡片
    if (!isChatLoading) {
      const toRemove: string[] = [];
      subAgentCards.forEach((_, taskId) => {
        if (!nextSnapshots.has(taskId)) {
          toRemove.push(taskId);
        }
      });
      toRemove.forEach((taskId) => removeSubAgent(taskId));
    }

    setIsSubAgentPanelOpen(nextSnapshots.size > 0);
    if (nextSnapshots.size === 0) {
      setActiveSubAgentTaskId(undefined);
      return;
    }
    const availableTaskIds = new Set(nextSnapshots.keys());
    if (!activeSubAgentTaskId || !availableTaskIds.has(activeSubAgentTaskId)) {
      setActiveSubAgentTaskId([...availableTaskIds][0]);
    }
  }, [
    messages,
    selectedAgent,
    isLoadingMessages,
    isChatLoading,
    subAgentCards,
    upsertSubAgentCard,
    removeSubAgent,
    activeSubAgentTaskId,
  ]);

  // Input ref for submit handler
  const inputRef = useRef(input);
  inputRef.current = input;

  // Handlers
  const handleAgentClose = useCallback((taskId: string) => {
    removeSubAgent(taskId);
    if (activeSubAgentTaskId === taskId) {
      setActiveSubAgentTaskId(undefined);
    }
  }, [removeSubAgent, activeSubAgentTaskId]);

  const handleOpenSubAgentPanel = useCallback((payload: OpenSubAgentPanelPayload) => {
    const { taskId, task, reposCount } = payload;
    if (!taskId)
      return;
    setIsSubAgentPanelOpen(true);
    setActiveSubAgentTaskId(taskId);
    if (task || typeof reposCount === "number") {
      upsertSubAgentCard(taskId, {
        ...(task ? { task } : {}),
        ...(typeof reposCount === "number" ? { reposCount } : {}),
      });
    }
    if (!subAgentCards.has(taskId)) {
      handleProgress(taskId, "start", 0);
    }
  }, [subAgentCards, handleProgress, upsertSubAgentCard]);

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
