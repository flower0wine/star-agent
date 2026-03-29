/**
 * Pending Message Store
 *
 * 用于在页面跳转时传递待发送的消息
 * 当用户在 /chat 页面发送消息时，消息会被存储在这里，
 * 然后在 /chat/[conversationId] 页面加载后发送
 */

import { create } from "zustand";

interface PendingMessage {
  /** 对话 ID */
  conversationId: string;
  /** 消息文本 */
  text: string;
  /** Agent ID */
  agentId: string;
}

interface PendingMessageState {
  /** 待发送的消息 */
  pendingMessage: PendingMessage | null;
  /** 设置待发送消息 */
  setPendingMessage: (message: PendingMessage) => void;
  /** 获取并清除待发送消息 */
  consumePendingMessage: (conversationId: string) => PendingMessage | null;
  /** 清除待发送消息 */
  clearPendingMessage: () => void;
}

export const usePendingMessageStore = create<PendingMessageState>((set, get) => ({
  pendingMessage: null,

  setPendingMessage: (message) => {
    set({ pendingMessage: message });
  },

  consumePendingMessage: (conversationId) => {
    const { pendingMessage } = get();
    if (pendingMessage && pendingMessage.conversationId === conversationId) {
      set({ pendingMessage: null });
      return pendingMessage;
    }
    return null;
  },

  clearPendingMessage: () => {
    set({ pendingMessage: null });
  },
}));
