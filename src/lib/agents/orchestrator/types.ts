/**
 * Orchestrator Types
 *
 * Type definitions for the agent orchestration system.
 */

import type { UIMessage } from "ai";
import type { SubAgentTask } from "../sub-agent/types";

/**
 * Execution cycle status
 */
export type ExecutionCycleStatus
  = | "idle"
    | "master-running"
    | "waiting-subagents"
    | "master-resuming"
    | "completed"
    | "failed";

/**
 * Sub-agent execution result
 */
export interface SubAgentResult {
  /** Task ID */
  taskId: string;
  /** Task description */
  task: string;
  /** Execution status */
  status: "completed" | "failed";
  /** Final messages from sub-agent */
  messages: UIMessage[];
  /** Error message if failed */
  error?: string;
  /** Completion timestamp */
  completedAt: Date;
}

/**
 * Execution cycle state
 */
export interface ExecutionCycleState {
  /** Current cycle number (starts at 1) */
  cycleNumber: number;
  /** Current status */
  status: ExecutionCycleStatus;
  /** Master agent completed in current cycle */
  masterCompleted: boolean;
  /** Sub-agent task IDs created in current cycle */
  currentCycleSubAgents: Set<string>;
  /** All sub-agent results collected */
  subAgentResults: Map<string, SubAgentResult>;
  /** Timestamp when master completed */
  masterCompletedAt?: Date;
  /** Timestamp when all sub-agents completed */
  allSubAgentsCompletedAt?: Date;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Maximum number of execution cycles (prevent infinite loops) */
  maxCycles?: number;
  /** Maximum wait time for sub-agents per cycle (ms) */
  subAgentTimeout?: number;
  /** Request ID for logging */
  requestId: string;
}

/**
 * Orchestrator event types
 */
export type OrchestratorEventType
  = | "cycle-start"
    | "master-complete"
    | "subagents-complete"
    | "cycle-complete"
    | "all-complete"
    | "error";

/**
 * Orchestrator event
 */
export interface OrchestratorEvent {
  type: OrchestratorEventType;
  cycleNumber: number;
  timestamp: Date;
  data?: unknown;
}
