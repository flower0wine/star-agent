/**
 * Chat API Types
 *
 * Type definitions for the Chat API
 */

import type { GitHubRepo } from "@/lib/github/api";
import type { UIMessage } from "ai";
import type { ChatMessageMetadata } from "@/lib/chat/message-metadata";

export interface ChatMessage extends UIMessage<ChatMessageMetadata> {}

export interface AgentConfigPayload {
  /** 系统提示词模板（支持变量） */
  systemPromptTemplate?: string;
  /** 每个工具的局部配置（按 Agent 隔离） */
  toolConfigs?: Record<string, {
    enabled?: boolean;
    defaultInput?: Record<string, unknown>;
  }>;
  /** 动态自定义参数 */
  customParams?: Record<string, unknown>;
  /** 静态配置参数快照 */
  staticParams?: Record<string, unknown>;
}

export interface ChatModelConfigPayload {
  providerId: string;
  modelId: string;
  apiKey?: string;
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
  /** 模型配置 */
  modelConfig?: ChatModelConfigPayload;
  // Legacy fields (for backward compatibility with star agent)
  username?: string;
  repos?: GitHubRepo[];
}

export interface StarAgentContext {
  username: string;
  repos: GitHubRepo[];
  reposContext: string;
}

