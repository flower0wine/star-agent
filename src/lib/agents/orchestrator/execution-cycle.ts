/**
 * Execution Cycle Manager
 *
 * Manages the execution cycle state and transitions.
 */

import type {
  ExecutionCycleState,
  ExecutionCycleStatus,
  SubAgentResult,
} from "./types";

/**
 * Execution Cycle Manager
 *
 * Tracks the state of master-subagent execution cycles.
 */
export class ExecutionCycleManager {
  private state: ExecutionCycleState;

  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Create initial state
   */
  private createInitialState(): ExecutionCycleState {
    return {
      cycleNumber: 1,
      status: "idle",
      masterCompleted: false,
      currentCycleSubAgents: new Set(),
      subAgentResults: new Map(),
    };
  }

  /**
   * Get current state (immutable copy)
   */
  getState(): Readonly<ExecutionCycleState> {
    return {
      ...this.state,
      currentCycleSubAgents: new Set(this.state.currentCycleSubAgents),
      subAgentResults: new Map(this.state.subAgentResults),
    };
  }

  /**
   * Update status
   */
  setStatus(status: ExecutionCycleStatus): void {
    this.state.status = status;
  }

  /**
   * Mark master as running
   */
  startMaster(): void {
    this.state.status = "master-running";
    this.state.masterCompleted = false;
  }

  /**
   * Mark master as completed
   */
  completeMaster(): void {
    this.state.masterCompleted = true;
    this.state.masterCompletedAt = new Date();
    this.state.status = "waiting-subagents";
  }

  /**
   * Register a new sub-agent task
   */
  registerSubAgent(taskId: string): void {
    this.state.currentCycleSubAgents.add(taskId);
  }

  /**
   * Add sub-agent result
   */
  addSubAgentResult(result: SubAgentResult): void {
    this.state.subAgentResults.set(result.taskId, result);
  }

  /**
   * Check if all current cycle sub-agents are completed
   */
  areAllSubAgentsCompleted(): boolean {
    if (this.state.currentCycleSubAgents.size === 0) {
      return true;
    }

    for (const taskId of this.state.currentCycleSubAgents) {
      if (!this.state.subAgentResults.has(taskId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get completed sub-agent results for current cycle
   */
  getCurrentCycleResults(): SubAgentResult[] {
    const results: SubAgentResult[] = [];

    for (const taskId of this.state.currentCycleSubAgents) {
      const result = this.state.subAgentResults.get(taskId);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Mark all sub-agents as completed
   */
  completeSubAgents(): void {
    this.state.allSubAgentsCompletedAt = new Date();
  }

  /**
   * Start a new cycle
   */
  startNewCycle(): void {
    this.state.cycleNumber += 1;
    this.state.status = "master-resuming";
    this.state.masterCompleted = false;
    this.state.currentCycleSubAgents.clear();
    // Keep subAgentResults for history
  }

  /**
   * Mark orchestration as completed
   */
  complete(): void {
    this.state.status = "completed";
  }

  /**
   * Mark orchestration as failed
   */
  fail(): void {
    this.state.status = "failed";
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Get cycle number
   */
  getCycleNumber(): number {
    return this.state.cycleNumber;
  }

  /**
   * Check if master is completed
   */
  isMasterCompleted(): boolean {
    return this.state.masterCompleted;
  }

  /**
   * Get current cycle sub-agent count
   */
  getCurrentCycleSubAgentCount(): number {
    return this.state.currentCycleSubAgents.size;
  }
}
