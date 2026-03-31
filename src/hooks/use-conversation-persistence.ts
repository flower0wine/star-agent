/**
 * Conversation Persistence Hook
 *
 * 管理对话消息的持久化：加载、保存、同步
 * 与 useAgentChat 配合使用，实现消息的 IndexedDB 存储
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";

import { loadMessages, saveMessage, saveMessages } from "@/lib/storage";
import { useChatHistoryStore } from "@/stores/chat-history-store";

interface UseConversationPersistenceOptions<TMessage extends UIMessage = UIMessage> {
  /** 当前对话 ID */
  conversationId: string | null;
  /** 当前消息列表（来自 useChat） */
  messages: TMessage[];
  /** 设置消息的函数（来自 useChat） */
  setMessages: (messages: TMessage[] | ((prev: TMessage[]) => TMessage[])) => void;
  /** 聊天状态 */
  status: string;
  /** Agent ID */
  agentId: string;
  /** 用户名 */
  username: string | null;
}

interface UseConversationPersistenceReturn {
  /** 是否正在加载消息 */
  isLoadingMessages: boolean;
  /** 当前活动的对话 ID */
  activeConversationId: string | null;
  /** 确保有活动对话（如果没有则创建） */
  ensureConversation: () => Promise<string>;
}

function mergeMessagesById<TMessage extends UIMessage>(
  loadedMessages: TMessage[],
  currentMessages: TMessage[]
): TMessage[] {
  if (currentMessages.length === 0) {
    return loadedMessages;
  }

  const loadedIds = new Set(loadedMessages.map(message => message.id));
  const appendedMessages = currentMessages.filter(message => !loadedIds.has(message.id));

  if (appendedMessages.length === 0) {
    return loadedMessages;
  }

  return [...loadedMessages, ...appendedMessages];
}

export function useConversationPersistence<TMessage extends UIMessage = UIMessage>({
  conversationId,
  messages,
  setMessages,
  status,
  agentId,
  username,
}: UseConversationPersistenceOptions<TMessage>): UseConversationPersistenceReturn {
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId);

  const { createNewConversation, selectConversation } = useChatHistoryStore();

  // 跟踪上一次的状态，用于检测流式传输结束
  const prevStatusRef = useRef(status);
  const isSavingRef = useRef(false);
  const persistedUserMessageIdsRef = useRef<Set<string>>(new Set());
  // 使用 undefined 初始化，以区分"未初始化"和"null"
  const prevConversationIdRef = useRef<string | null | undefined>(undefined);

  // 当对话 ID 变化时，加载消息
  useEffect(() => {
    // 首次渲染或 conversationId 变化时执行
    const isFirstRender = prevConversationIdRef.current === undefined;
    const hasChanged = conversationId !== prevConversationIdRef.current;

    if (!isFirstRender && !hasChanged) {
      return;
    }
    prevConversationIdRef.current = conversationId;

    if (!conversationId) {
      // 清空消息（新对话或切换到新对话页面）
      if (!isFirstRender) {
        setMessages([] as TMessage[]);
      }
      setActiveConversationId(null);
      return;
    }

    // 切换会话时先清空旧消息，避免不同会话消息混入
    setMessages([] as TMessage[]);

    const loadConversationMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const loadedMessages = await loadMessages(conversationId);
        setMessages((prevMessages) => {
          return mergeMessagesById(loadedMessages as TMessage[], prevMessages);
        });
        setActiveConversationId(conversationId);
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    void loadConversationMessages();
  }, [conversationId, setMessages]);

  useEffect(() => {
    persistedUserMessageIdsRef.current.clear();
  }, [conversationId]);

  // 用户消息发送后立即持久化，避免路由变化或刷新导致首条消息丢失
  useEffect(() => {
    const isSending = status === "submitted" || status === "streaming";
    if (!isSending || !activeConversationId || messages.length === 0 || isLoadingMessages) {
      return;
    }

    const lastMessage = messages.at(-1);
    if (!lastMessage || lastMessage.role !== "user") {
      return;
    }

    const persistKey = `${activeConversationId}:${lastMessage.id}`;
    if (persistedUserMessageIdsRef.current.has(persistKey)) {
      return;
    }
    persistedUserMessageIdsRef.current.add(persistKey);

    const persistUserMessage = async () => {
      try {
        await saveMessage(activeConversationId, lastMessage);
      } catch (error) {
        persistedUserMessageIdsRef.current.delete(persistKey);
        console.error("Failed to save user message immediately:", error);
      }
    };

    void persistUserMessage();
  }, [status, activeConversationId, messages, isLoadingMessages]);

  // 当流式传输结束时保存消息
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming";
    const isNowReady = status === "ready";
    prevStatusRef.current = status;

    // 只在流式传输刚结束时保存
    if (!wasStreaming || !isNowReady) {
      return;
    }

    if (!activeConversationId || messages.length === 0 || isSavingRef.current) {
      return;
    }

    const saveConversationMessages = async () => {
      isSavingRef.current = true;
      try {
        await saveMessages(activeConversationId, messages);
      } catch (error) {
        console.error("Failed to save messages:", error);
      } finally {
        isSavingRef.current = false;
      }
    };

    void saveConversationMessages();
  }, [status, activeConversationId, messages]);

  // 确保有活动对话
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (activeConversationId) {
      return activeConversationId;
    }

    // 创建新对话
    const conversation = await createNewConversation(agentId, username);
    setActiveConversationId(conversation.id);
    selectConversation(conversation.id);
    return conversation.id;
  }, [activeConversationId, agentId, username, createNewConversation, selectConversation]);

  return {
    isLoadingMessages,
    activeConversationId,
    ensureConversation,
  };
}
