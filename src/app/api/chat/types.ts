/**
 * Chat API Types
 *
 * Type definitions for the Chat API
 */

import type { GitHubRepo } from "@/lib/github/api";
import type { LanguageModelUsage, UIMessage } from "ai";

export interface ChatMessage extends UIMessage<{ totalUsage: LanguageModelUsage }> {}

export interface AgentConfigPayload {
  /** 附加系统提示词 */
  additionalSystemPrompt?: string;
  /** 启用的工具 ID 列表 */
  enabledTools?: string[];
}

export interface ChatRequestBody {
  messages: UIMessage[];
  agentId?: string;
  context?: {
    username?: string;
    repos?: GitHubRepo[];
  };
  /** Agent 配置 */
  agentConfig?: AgentConfigPayload;
  // Legacy fields (for backward compatibility with star agent)
  username?: string;
  repos?: GitHubRepo[];
}

export interface StarAgentContext {
  username: string;
  repos: GitHubRepo[];
  reposContext: string;
}
