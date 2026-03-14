// =============================================================================
// Conversation Storage Service
// Handles persistence of conversations to localStorage
// =============================================================================

import { LocalStorageRepository, STORAGE_KEYS } from "./storage";
import type { Conversation, ConversationSummary, Message } from "@/types/storage";

export class ConversationStorage {
  private repository = new LocalStorageRepository<Conversation>();
  private readonly PREFIX = STORAGE_KEYS.CONVERSATION_PREFIX;

  /**
   * Get all conversations (summary list for sidebar)
   */
  async getAll(): Promise<ConversationSummary[]> {
    const keys = await this.repository.list(this.PREFIX);
    const conversations: ConversationSummary[] = [];

    for (const key of keys) {
      const conv = await this.repository.get(key);
      if (conv) {
        conversations.push({
          id: conv.id,
          title: conv.title,
          lastMessage: conv.messages.at(-1)?.content ?? "",
          messageCount: conv.messages.length,
          updatedAt: conv.updatedAt,
        });
      }
    }

    // Sort by updated time (newest first)
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get single conversation with messages
   */
  async get(id: string): Promise<Conversation | null> {
    return this.repository.get(`${this.PREFIX}${id}`);
  }

  /**
   * Save conversation
   */
  async save(conversation: Conversation): Promise<void> {
    conversation.updatedAt = Date.now();
    await this.repository.set(`${this.PREFIX}${conversation.id}`, conversation);
  }

  /**
   * Update conversation title
   */
  async updateTitle(id: string, title: string): Promise<void> {
    const conversation = await this.get(id);
    if (conversation) {
      conversation.title = title;
      await this.save(conversation);
    }
  }

  /**
   * Add message to conversation
   */
  async addMessage(id: string, message: Message): Promise<Conversation | null> {
    const conversation = await this.get(id);
    if (!conversation) {
      return null;
    }

    conversation.messages.push(message);

    // Auto-update title from first user message if still "New Chat"
    if (conversation.title === "New Chat" && message.role === "user") {
      const titleContent = message.content.slice(0, 50);
      conversation.title = titleContent + (message.content.length > 50 ? "..." : "");
    }

    await this.save(conversation);
    return conversation;
  }

  /**
   * Delete conversation
   */
  async delete(id: string): Promise<void> {
    await this.repository.delete(`${this.PREFIX}${id}`);
  }

  /**
   * Create new conversation
   */
  async create(title: string = "New Chat"): Promise<Conversation> {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };

    await this.save(conversation);
    return conversation;
  }

  /**
   * Clear all conversations
   */
  async clearAll(): Promise<void> {
    const keys = await this.repository.list(this.PREFIX);
    for (const key of keys) {
      await this.repository.delete(key);
    }
  }

  /**
   * Get conversation count
   */
  async count(): Promise<number> {
    const keys = await this.repository.list(this.PREFIX);
    return keys.length;
  }
}

// Export singleton instance
export const conversationStorage = new ConversationStorage();
