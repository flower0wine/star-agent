/**
 * Message Storage Service
 *
 * 专门处理消息的持久化存储，与 Vercel AI SDK 的 UIMessage 格式兼容
 * 单一职责：仅负责消息的存储和检索
 */

import type { UIMessage } from "ai";

import { getDB } from "./db";
import type { ChatMessage } from "./db";

/**
 * 将 UIMessage 转换为 ChatMessage（存储格式）
 */
function uiMessageToChatMessage(
  message: UIMessage,
  conversationId: string,
  createdAt?: number
): ChatMessage {
  // 从 parts 中提取纯文本内容
  let content = "";
  for (const part of message.parts) {
    if (part.type === "text") {
      content += part.text;
    }
  }

  return {
    id: message.id,
    conversationId,
    role: message.role as ChatMessage["role"],
    content,
    parts: message.parts as unknown[],
    metadata: message.metadata as Record<string, unknown> | undefined,
    createdAt: createdAt ?? Date.now(),
  };
}

/**
 * 将 ChatMessage 转换为 UIMessage（UI 格式）
 */
function chatMessageToUIMessage(message: ChatMessage): UIMessage {
  return {
    id: message.id,
    role: message.role as UIMessage["role"],
    parts: message.parts as UIMessage["parts"],
    metadata: message.metadata,
  };
}

/**
 * 保存单条消息
 */
export async function saveMessage(
  conversationId: string,
  message: UIMessage
): Promise<void> {
  const db = await getDB();
  const chatMessage = uiMessageToChatMessage(message, conversationId);

  await db.put("messages", chatMessage);

  // 更新对话的时间戳和消息计数
  const conversation = await db.get("conversations", conversationId);
  if (conversation) {
    await db.put("conversations", {
      ...conversation,
      updatedAt: Date.now(),
      messageCount: conversation.messageCount + 1,
    });
  }
}

/**
 * 批量保存消息（用于保存完整对话）
 */
export async function saveMessages(
  conversationId: string,
  messages: UIMessage[]
): Promise<void> {
  const db = await getDB();

  // 先删除该对话的所有现有消息
  const existingMessages = await db.getAllFromIndex(
    "messages",
    "by-conversation",
    conversationId
  );
  const deleteTx = db.transaction("messages", "readwrite");
  for (const msg of existingMessages) {
    await deleteTx.store.delete(msg.id);
  }
  await deleteTx.done;

  // 保存新消息
  const saveTx = db.transaction("messages", "readwrite");
  for (const message of messages) {
    const chatMessage = uiMessageToChatMessage(message, conversationId);
    await saveTx.store.put(chatMessage);
  }
  await saveTx.done;

  // 更新对话元数据
  const conversation = await db.get("conversations", conversationId);
  if (conversation) {
    await db.put("conversations", {
      ...conversation,
      updatedAt: Date.now(),
      messageCount: messages.length,
    });
  }
}

/**
 * 加载对话的所有消息
 */
export async function loadMessages(conversationId: string): Promise<UIMessage[]> {
  const db = await getDB();
  const chatMessages = await db.getAllFromIndex(
    "messages",
    "by-conversation",
    conversationId
  );

  // 按创建时间排序
  chatMessages.sort((a, b) => a.createdAt - b.createdAt);

  return chatMessages.map(chatMessageToUIMessage);
}

/**
 * 更新最后一条消息（用于流式更新完成后）
 */
export async function updateLastMessage(
  conversationId: string,
  message: UIMessage
): Promise<void> {
  const db = await getDB();
  const chatMessage = uiMessageToChatMessage(message, conversationId);

  await db.put("messages", chatMessage);

  // 更新对话时间戳
  const conversation = await db.get("conversations", conversationId);
  if (conversation) {
    await db.put("conversations", {
      ...conversation,
      updatedAt: Date.now(),
    });
  }
}

/**
 * 删除对话的所有消息
 */
export async function deleteMessages(conversationId: string): Promise<void> {
  const db = await getDB();
  const messages = await db.getAllFromIndex(
    "messages",
    "by-conversation",
    conversationId
  );

  const tx = db.transaction("messages", "readwrite");
  for (const msg of messages) {
    await tx.store.delete(msg.id);
  }
  await tx.done;
}
