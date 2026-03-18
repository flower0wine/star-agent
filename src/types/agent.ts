/**
 * Agent Types
 *
 * Type definitions for multi-agent streaming architecture.
 */

import type { LanguageModelUsage } from "ai";

/**
 * Message stream source type
 */
export type MessageStreamSource = "master" | "subagent";

/**
 * Chat message with stream metadata
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: unknown[];
  createdAt: Date;
  metadata?: {
    streamId: string;
    source: MessageStreamSource;
    totalUsage?: LanguageModelUsage;
  };
}

/**
 * Sub-agent card state
 */
export interface SubAgentCard {
  taskId: string;
  status: "pending" | "running" | "completed" | "failed";
  task: string;
  reposCount: number;
  progress: number;
  currentOutput?: string;
  finalResult?: string;
  error?: string;
}

/**
 * SSE message from multi-stream API
 */
export interface SSEMessage {
  streamId: string;
  type?: string;
  messageId?: string;
  chunk?: unknown;
  content?: string;
  progress?: number;
  toolCall?: unknown;
  toolResult?: unknown;
  error?: string;
  result?: string;
}
