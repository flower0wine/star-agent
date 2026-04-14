import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";

// ============================================================================
// Chat Types
// ============================================================================

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

// ============================================================================
// Agent Configuration Types
// ============================================================================

/**
 * Agent 动态配置（所有 Agent 通用）
 */
export interface AgentDynamicConfig {
  /** 可编辑系统提示词模板（支持变量） */
  systemPromptTemplate: string;
  /** 每个工具的局部配置（按 Agent 隔离） */
  toolConfigs: Record<string, {
    enabled?: boolean;
    defaultInput?: Record<string, unknown>;
    boundSubAgentIds?: string[];
    dynamicParameters?: unknown;
  }>;
  /** 自定义参数 */
  customParams: Record<string, unknown>;
}

/**
 * Agent 配置
 * TStatic 为 Agent 特有的静态配置类型
 */
export interface AgentConfiguration<TStatic = Record<string, unknown>> {
  /** Agent ID */
  agentId: string;
  /** 配置版本 */
  version: number;
  /** 更新时间 */
  updatedAt: number;
  /** 静态配置（Agent 特有） */
  staticConfig: TStatic;
  /** 动态配置（通用） */
  dynamicConfig: AgentDynamicConfig;
}

// ============================================================================
// GitHub Cache Types
// ============================================================================

export type GitHubCacheDataType = "stars" | "user" | "repos";

export interface GitHubCacheEntry {
  /** 缓存键: `${username}:${dataType}` */
  key: string;
  /** 用户名 */
  username: string;
  /** 数据类型 */
  dataType: GitHubCacheDataType;
  /** 缓存数据 */
  data: unknown;
  /** 获取时间 */
  fetchedAt: number;
  /** 过期时间 */
  expiresAt: number;
}

// ============================================================================
// Room Types
// ============================================================================

export interface RoomRecord {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoomConfigRecord {
  roomId: string;
  config: unknown;
  updatedAt: number;
}

export interface RoomTurnStateRecord {
  roomId: string;
  state: unknown;
  updatedAt: number;
}

export interface RoomMessageRecord {
  id: string;
  roomId: string;
  turnNo: number;
  actorType: "user" | "character" | "playwright" | "system";
  actorId: string;
  actorName: string;
  visibleParts: Array<{
    type: "text" | "tool-summary";
    text: string;
  }>;
  renderParts?: unknown[];
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface RoomPromptRevisionRecord {
  id: string;
  roomId: string;
  cycleNo: number;
  worldPromptTemplate: string;
  playwrightOutput: string;
  characterPromptPatches: Array<{
    characterId: string;
    prompt: string;
  }>;
  rationale: string;
  createdAt: number;
}

// ============================================================================
// Database Schema
// ============================================================================

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
  agentConfigs: {
    key: string;
    value: AgentConfiguration;
    indexes: {
      "by-updated": number;
    };
  };
  githubCache: {
    key: string;
    value: GitHubCacheEntry;
    indexes: {
      "by-username": string;
      "by-expires": number;
    };
  };
  rooms: {
    key: string;
    value: RoomRecord;
    indexes: {
      "by-updated": number;
    };
  };
  roomConfigs: {
    key: string;
    value: RoomConfigRecord;
    indexes: {
      "by-updated": number;
    };
  };
  roomTurnStates: {
    key: string;
    value: RoomTurnStateRecord;
    indexes: {
      "by-updated": number;
    };
  };
  roomMessages: {
    key: string;
    value: RoomMessageRecord;
    indexes: {
      "by-room": string;
      "by-room-turn": [string, number];
      "by-room-created": [string, number];
    };
  };
  roomPromptRevisions: {
    key: string;
    value: RoomPromptRevisionRecord;
    indexes: {
      "by-room": string;
      "by-room-created": [string, number];
    };
  };
}

const DB_NAME = "star-agent-db";
const DB_VERSION = 3;

let dbInstance: IDBPDatabase<StarAgentDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<StarAgentDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<StarAgentDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Version 1: conversations and messages
      if (oldVersion < 1) {
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
      }

      // Version 2: agent configs and github cache
      if (oldVersion < 2) {
        // Agent configs store
        if (!db.objectStoreNames.contains("agentConfigs")) {
          const configStore = db.createObjectStore("agentConfigs", {
            keyPath: "agentId",
          });
          configStore.createIndex("by-updated", "updatedAt");
        }

        // GitHub cache store
        if (!db.objectStoreNames.contains("githubCache")) {
          const cacheStore = db.createObjectStore("githubCache", {
            keyPath: "key",
          });
          cacheStore.createIndex("by-username", "username");
          cacheStore.createIndex("by-expires", "expiresAt");
        }
      }

      // Version 3: room stores
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains("rooms")) {
          const roomStore = db.createObjectStore("rooms", {
            keyPath: "id",
          });
          roomStore.createIndex("by-updated", "updatedAt");
        }

        if (!db.objectStoreNames.contains("roomConfigs")) {
          const roomConfigStore = db.createObjectStore("roomConfigs", {
            keyPath: "roomId",
          });
          roomConfigStore.createIndex("by-updated", "updatedAt");
        }

        if (!db.objectStoreNames.contains("roomTurnStates")) {
          const roomTurnStateStore = db.createObjectStore("roomTurnStates", {
            keyPath: "roomId",
          });
          roomTurnStateStore.createIndex("by-updated", "updatedAt");
        }

        if (!db.objectStoreNames.contains("roomMessages")) {
          const roomMessageStore = db.createObjectStore("roomMessages", {
            keyPath: "id",
          });
          roomMessageStore.createIndex("by-room", "roomId");
          roomMessageStore.createIndex("by-room-turn", ["roomId", "turnNo"]);
          roomMessageStore.createIndex("by-room-created", ["roomId", "createdAt"]);
        }

        if (!db.objectStoreNames.contains("roomPromptRevisions")) {
          const roomPromptRevisionStore = db.createObjectStore("roomPromptRevisions", {
            keyPath: "id",
          });
          roomPromptRevisionStore.createIndex("by-room", "roomId");
          roomPromptRevisionStore.createIndex("by-room-created", ["roomId", "createdAt"]);
        }
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
