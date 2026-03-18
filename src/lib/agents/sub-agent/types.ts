/**
 * Sub-Agent Types
 *
 * Type definitions for the sub-agent streaming architecture.
 */

import type { GitHubRepo } from "@/lib/github/api";

/**
 * Sub-agent task status
 */
export type SubAgentTaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * Sub-agent task
 * Represents a task assigned to a sub-agent for parallel execution.
 */
export interface SubAgentTask {
  /** Unique identifier */
  id: string;
  /** Parent request ID for correlation */
  parentId: string;
  /** Task description */
  task: string;
  /** Repository list to process */
  repos: GitHubRepo[];
  /** GitHub username */
  username: string;
  /** Current status */
  status: SubAgentTaskStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Start timestamp */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Final result */
  result?: string;
  /** Error message if failed */
  error?: string;
  /** Stream ID for frontend routing */
  streamId?: string;
}

/**
 * Sub-agent progress event types
 */
export type SubAgentProgressType
  = | "start"
    | "progress"
    | "text"
    | "tool-call"
    | "tool-result"
    | "complete"
    | "error";

/**
 * Sub-agent progress event
 * Represents a progress update from a sub-agent.
 */
export interface SubAgentProgress {
  /** Task ID */
  taskId: string;
  /** Progress type */
  type: SubAgentProgressType;
  /** Text content */
  content?: string;
  /** Tool call data */
  toolCall?: Record<string, unknown>;
  /** Tool result data */
  toolResult?: Record<string, unknown>;
  /** Progress percentage */
  progress?: number;
  /** Error message */
  error?: string;
  /** Final result (when complete) */
  result?: string;
}

/**
 * Create sub-agent task input (without auto-generated fields)
 */
export type CreateSubAgentTaskInput = Omit<
  SubAgentTask,
  "id" | "status" | "createdAt" | "streamId" | "parentId"
> & {
  /** Parent request ID for correlation (optional, will be filled by manager) */
  parentId?: string;
};

/**
 * Create sub-agent task output
 */
export interface CreateSubAgentTaskOutput {
  taskId: string;
  status: "launched";
  message: string;
  reposCount: number;
  async: true;
}
