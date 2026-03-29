/**
 * Chat Page (New Conversation)
 *
 * 新对话入口页面
 * 只负责展示输入界面、创建会话 ID、跳转到 /chat/[conversationId]
 * 不处理任何消息发送逻辑
 */

"use client";

import { NewChatView } from "@/components/chat";

export default function ChatPage() {
  return <NewChatView />;
}
