/**
 * Sub-Agent Types
 *
 * Type definitions for the sub-agent streaming architecture.
 */

import type { UIMessage } from "ai";
import type { GitHubRepo } from "@/lib/github/api";

export type TemplateVariableType = "string" | "number" | "boolean";

export interface SubAgentVarDef {
  type: TemplateVariableType;
  required?: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
}

export interface SubAgentProfile {
  id: string;
  name: string;
  enabled: boolean;
  toolIds: string[];
  systemPromptTemplate: string;
  varSchema: Record<string, SubAgentVarDef>;
  limits: {
    timeoutMs: number;
  };
  version: number;
}

export interface SubAgentMetadata {
  profileId: string;
  profileVersion: number;
  originTool: string;
}

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
  /** Parent agent id */
  parentAgentId: string;
  /** Selected profile id */
  profileId: string;
  /** Profile version snapshot */
  profileVersion: number;
  /** Origin tool name */
  originTool: string;
  /** Variable snapshot for runtime prompt rendering */
  runtimeVars: Record<string, string | number | boolean>;
  /** Profile snapshot for deterministic execution */
  profileSnapshot: SubAgentProfile;
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
  /** Collected messages from execution */
  messages?: UIMessage[];
}

/**
 * Sub-agent progress event types
 */
export type SubAgentProgressType
  = | "start"
    | "progress"
    | "complete"
    | "error"
    | "message-chunk";

/**
 * Sub-agent progress event
 * Represents a progress update from a sub-agent.
 */
export interface SubAgentProgress {
  /** Task ID */
  taskId: string;
  /** Task description */
  task?: string;
  /** Progress type */
  type: SubAgentProgressType;
  /** UIMessageChunk for message-chunk events */
  chunk?: unknown;
  /** Progress percentage */
  progress?: number;
  /** Error message */
  error?: string;
  /** Final result (when complete) */
  result?: string;
  /** Sub-agent metadata for generic UI rendering */
  subAgent?: SubAgentMetadata;
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
  subAgent: SubAgentMetadata;
}
