/**
 * Chat API Types
 *
 * Type definitions for the Chat API
 */

import type { GitHubRepo } from "@/lib/github/api";
import type { LanguageModelUsage, UIMessage } from "ai";

export interface ChatMessage extends UIMessage<{ totalUsage: LanguageModelUsage }> {}

export interface ChatRequestBody {
  messages: UIMessage[];
  agentId?: string;
  context?: {
    username?: string;
    repos?: GitHubRepo[];
  };
  // Legacy fields (for backward compatibility with star agent)
  username?: string;
  repos?: GitHubRepo[];
}

export interface StarAgentContext {
  username: string;
  repos: GitHubRepo[];
  reposContext: string;
}
