import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";

export interface ChatConversation {
  id: string;
  title: string;
  agentId: string;
  username: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  parts: unknown[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

interface StarAgentDB extends DBSchema {
  conversations: {
    key: string;
    value: ChatConversation;
    indexes: {
      "by-updated": number;
      "by-agent": string;
    };
  };
  messages: {
    key: string;
    value: ChatMessage;
    indexes: {
      "by-conversation": string;
      "by-created": number;
    };
  };
}

const DB_NAME = "star-agent-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<StarAgentDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<StarAgentDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<StarAgentDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Conversations store
      if (!db.objectStoreNames.contains("conversations")) {
        const conversationStore = db.createObjectStore("conversations", {
          keyPath: "id",
        });
        conversationStore.createIndex("by-updated", "updatedAt");
        conversationStore.createIndex("by-agent", "agentId");
      }

      // Messages store
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", {
          keyPath: "id",
        });
        messageStore.createIndex("by-conversation", "conversationId");
        messageStore.createIndex("by-created", "createdAt");
      }
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
