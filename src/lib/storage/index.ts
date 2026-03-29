// Agent config storage
export {
  DEFAULT_DYNAMIC_CONFIG,
  deleteAgentConfig,
  getAgentConfig,
  getAllAgentConfigs,
  getOrCreateAgentConfig,
  resetAgentConfig,
  saveAgentConfig,
  updateDynamicConfig,
  updateStaticConfig,
} from "./agent-config-storage";

// Chat storage
export {
  clearAllData,
  createConversation,
  deleteConversation,
  deleteOldConversations,
  getAllConversations,
  getConversation,
  getConversationsByAgent,
  updateConversation,
} from "./chat-storage";
export type { ChatConversation, ChatMessage } from "./chat-storage";

// Database
export { closeDB, getDB } from "./db";
export type {
  AgentConfiguration,
  AgentDynamicConfig,
  GitHubCacheDataType,
  GitHubCacheEntry,
} from "./db";

// GitHub cache storage
export {
  cleanExpiredCache,
  clearAllCache,
  createCacheKey,
  DEFAULT_CACHE_TTL,
  deleteCacheEntry,
  deleteUserCache,
  getCacheEntry,
  getStarsCache,
  getStarsCacheInfo,
  hasValidStarsCache,
  setCacheEntry,
  setStarsCache,
} from "./github-cache-storage";

// Message storage
export {
  deleteMessages,
  loadMessages,
  saveMessage,
  saveMessages,
  updateLastMessage,
} from "./message-storage";
