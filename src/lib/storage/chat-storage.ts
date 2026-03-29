import { nanoid } from "nanoid";
import dayjs from "dayjs";

import { getDB } from "./db";
import type { ChatConversation, ChatMessage } from "./db";

export type { ChatConversation, ChatMessage };

export async function createConversation(
  agentId: string,
  username: string | null,
  title?: string
): Promise<ChatConversation> {
  const db = await getDB();
  const now = Date.now();

  const conversation: ChatConversation = {
    id: nanoid(),
    title: title || `对话 ${dayjs(now).format("MM-DD HH:mm")}`,
    agentId,
    username,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  await db.put("conversations", conversation);
  return conversation;
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<ChatConversation, "title" | "updatedAt" | "messageCount">>
): Promise<void> {
  const db = await getDB();
  const conversation = await db.get("conversations", id);

  if (conversation) {
    await db.put("conversations", {
      ...conversation,
      ...updates,
      updatedAt: updates.updatedAt ?? Date.now(),
    });
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();

  // Delete all messages in the conversation
  const messages = await db.getAllFromIndex("messages", "by-conversation", id);
  const tx = db.transaction("messages", "readwrite");
  for (const msg of messages) {
    await tx.store.delete(msg.id);
  }
  await tx.done;

  // Delete the conversation
  await db.delete("conversations", id);
}

export async function getConversation(id: string): Promise<ChatConversation | undefined> {
  const db = await getDB();
  return db.get("conversations", id);
}

export async function getAllConversations(): Promise<ChatConversation[]> {
  const db = await getDB();
  const conversations = await db.getAllFromIndex("conversations", "by-updated");
  return conversations.reverse(); // Most recent first
}

export async function getConversationsByAgent(agentId: string): Promise<ChatConversation[]> {
  const db = await getDB();
  const conversations = await db.getAllFromIndex("conversations", "by-agent", agentId);
  return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addMessage(
  conversationId: string,
  message: Omit<ChatMessage, "id" | "conversationId" | "createdAt">
): Promise<ChatMessage> {
  const db = await getDB();
  const now = Date.now();

  const chatMessage: ChatMessage = {
    id: nanoid(),
    conversationId,
    createdAt: now,
    ...message,
  };

  await db.put("messages", chatMessage);

  // Update conversation
  const conversation = await db.get("conversations", conversationId);
  if (conversation) {
    await db.put("conversations", {
      ...conversation,
      updatedAt: now,
      messageCount: conversation.messageCount + 1,
    });
  }

  return chatMessage;
}

export async function updateMessage(
  id: string,
  updates: Partial<Pick<ChatMessage, "content" | "parts">>
): Promise<void> {
  const db = await getDB();
  const message = await db.get("messages", id);

  if (message) {
    await db.put("messages", { ...message, ...updates });
  }
}

export async function getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex("messages", "by-conversation", conversationId);
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();

  const txConversations = db.transaction("conversations", "readwrite");
  await txConversations.store.clear();
  await txConversations.done;

  const txMessages = db.transaction("messages", "readwrite");
  await txMessages.store.clear();
  await txMessages.done;
}

export async function deleteOldConversations(daysToKeep: number): Promise<number> {
  const db = await getDB();
  const cutoff = dayjs().subtract(daysToKeep, "day").valueOf();

  const conversations = await db.getAll("conversations");
  const oldConversations = conversations.filter((c) => c.updatedAt < cutoff);

  for (const conversation of oldConversations) {
    await deleteConversation(conversation.id);
  }

  return oldConversations.length;
}
