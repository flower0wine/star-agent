/**
 * Chat Page (New Conversation)
 *
 * 新对话入口页面
 * 当用户发送第一条消息时，自动创建会话并跳转到 /chat/[conversationId]
 */

"use client";

import { ChatView } from "@/components/chat/chat-view";

export default function ChatPage() {
  // 新对话：conversationId 为 null
  return <ChatView conversationId={null} />;
}
