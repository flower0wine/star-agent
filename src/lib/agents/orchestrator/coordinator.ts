/**
 * Agent Orchestrator
 *
 * Coordinates the execution cycle between Master Agent and Sub-Agents.
 * Implements the core logic for waiting and resuming master agent execution.
 */

import type { UIMessage } from "ai";
import type { SubAgentTask } from "../sub-agent/types";
import { getSubAgentManager } from "../sub-agent/manager";
import { ExecutionCycleManager } from "./execution-cycle";
import type {
  OrchestratorConfig,
  OrchestratorEvent,
  SubAgentResult,
} from "./types";

/**
 * Agent Orchestrator
 *
 * Manages the execution flow:
 * 1. Master runs and creates sub-agents
 * 2. Wait for master to complete
 * 3. Wait for all sub-agents to complete
 * 4. Resume master with sub-agent results
 * 5. Repeat if master creates new sub-agents
 */
export class AgentOrchestrator {
  private cycleManager: ExecutionCycleManager;
  private config: Required<OrchestratorConfig>;
  private eventListeners: Set<(event: OrchestratorEvent) => void>;
  private subAgentManager = getSubAgentManager();

  constructor(config: OrchestratorConfig) {
    this.cycleManager = new ExecutionCycleManager();
    this.config = {
      maxCycles: config.maxCycles ?? 10,
      subAgentTimeout: config.subAgentTimeout ?? 180000, // 3 minutes
      requestId: config.requestId,
    };
    this.eventListeners = new Set();
  }

  /**
   * Subscribe to orchestrator events
   */
  subscribe(listener: (event: OrchestratorEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(
    type: OrchestratorEvent["type"],
    data?: unknown
  ): void {
    const event: OrchestratorEvent = {
      type,
      cycleNumber: this.cycleManager.getCycleNumber(),
      timestamp: new Date(),
      data,
    };

    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error(
          `[Orchestrator/${this.config.requestId}] Event listener error:`,
          error
        );
      }
    });
  }

  /**
   * Register a new sub-agent task
   * Called when master agent creates a sub-agent
   */
  registerSubAgent(taskId: string): void {
    this.cycleManager.registerSubAgent(taskId);
    console.log(
      `[Orchestrator/${this.config.requestId}] Registered sub-agent: ${taskId} (Cycle ${this.cycleManager.getCycleNumber()})`
    );
  }

  /**
   * Notify that master agent has completed
   */
  notifyMasterComplete(): void {
    this.cycleManager.completeMaster();
    console.log(
      `[Orchestrator/${this.config.requestId}] Master completed (Cycle ${this.cycleManager.getCycleNumber()})`
    );
    this.emit("master-complete");
  }

  /**
   * Wait for all sub-agents in current cycle to complete
   *
   * @returns Sub-agent results
   */
  async waitForSubAgents(): Promise<SubAgentResult[]> {
    const cycleNumber = this.cycleManager.getCycleNumber();
    const subAgentCount = this.cycleManager.getCurrentCycleSubAgentCount();

    console.log(
      `[Orchestrator/${this.config.requestId}] Waiting for ${subAgentCount} sub-agents (Cycle ${cycleNumber})`
    );

    // If no sub-agents, return immediately
    if (subAgentCount === 0) {
      console.log(
        `[Orchestrator/${this.config.requestId}] No sub-agents to wait for (Cycle ${cycleNumber})`
      );
      return [];
    }

    const pendingTaskIds = this.getPendingTaskIdsForCurrentCycle();
    const completionResult = await this.waitForPendingTasks(
      pendingTaskIds,
      this.config.subAgentTimeout
    );

    if (completionResult === "completed" && this.cycleManager.areAllSubAgentsCompleted()) {
      this.cycleManager.completeSubAgents();
      const results = this.cycleManager.getCurrentCycleResults();
      console.log(
        `[Orchestrator/${this.config.requestId}] All sub-agents completed (Cycle ${cycleNumber})`
      );
      this.emit("subagents-complete", { results });
      return results;
    }

    // Timeout reached
    console.warn(
      `[Orchestrator/${this.config.requestId}] Sub-agent wait timeout (Cycle ${cycleNumber})`
    );

    for (const taskId of pendingTaskIds) {
      this.collectResultIfTerminal(this.subAgentManager.getTask(taskId));
    }

    // Return whatever results we have
    return this.cycleManager.getCurrentCycleResults();
  }

  private getPendingTaskIdsForCurrentCycle(): string[] {
    const state = this.cycleManager.getState();
    return [...state.currentCycleSubAgents].filter(taskId => !state.subAgentResults.has(taskId));
  }

  private collectResultIfTerminal(task: SubAgentTask | undefined): void {
    if (!task) {
      return;
    }
    if (task.status !== "completed" && task.status !== "failed") {
      return;
    }

    const current = this.cycleManager.getState();
    if (current.subAgentResults.has(task.id)) {
      return;
    }

    const result = this.createSubAgentResult(task);
    this.cycleManager.addSubAgentResult(result);
    console.log(
      `[Orchestrator/${this.config.requestId}] Collected result from ${task.id}: ${task.status}`
    );
  }

  private async waitForPendingTasks(
    taskIds: string[],
    timeoutMs: number
  ): Promise<"completed" | "timeout"> {
    const completionPromises = taskIds.map(async (taskId) => {
      const task = await this.subAgentManager.waitForTaskCompletion(taskId);
      this.collectResultIfTerminal(task);
    });

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutHandle = setTimeout(resolve, timeoutMs, "timeout");
    });

    const outcome = await Promise.race([
      Promise.all(completionPromises).then(() => "completed" as const),
      timeoutPromise,
    ]);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    return outcome;
  }

  /**
   * Create sub-agent result from task
   */
  private createSubAgentResult(task: SubAgentTask): SubAgentResult {
    const messages: UIMessage[] = task.messages?.length
      ? task.messages
      : task.result
        ? [
            {
              id: `${task.id}-result`,
              role: "assistant",
              parts: [{ type: "text", text: task.result }],
            },
          ]
        : [];

    return {
      taskId: task.id,
      task: task.task,
      status: task.status === "completed" ? "completed" : "failed",
      messages,
      error: task.error,
      completedAt: task.completedAt || new Date(),
    };
  }

  /**
   * Check if should start a new cycle
   *
   * @param results Sub-agent results from current cycle
   * @returns True if should continue with new cycle
   */
  shouldStartNewCycle(results: SubAgentResult[]): boolean {
    const cycleNumber = this.cycleManager.getCycleNumber();

    // Check max cycles limit
    if (cycleNumber >= this.config.maxCycles) {
      console.log(
        `[Orchestrator/${this.config.requestId}] Max cycles reached: ${this.config.maxCycles}`
      );
      return false;
    }

    // Check if there are any successful results
    const hasSuccessfulResults = results.some((r) => r.status === "completed");
    if (!hasSuccessfulResults) {
      console.log(
        `[Orchestrator/${this.config.requestId}] No successful sub-agent results, stopping`
      );
      return false;
    }

    return true;
  }

  /**
   * Format sub-agent results for master agent
   *
   * @param results Sub-agent results
   * @returns Formatted message content
   */
  formatResultsForMaster(results: SubAgentResult[]): string {
    if (results.length === 0) {
      return "所有子 Agent 已完成，但没有返回结果。";
    }

    const sections: string[] = [
      `# 子 Agent 执行结果汇总 (共 ${results.length} 个)\n`,
    ];

    results.forEach((result, index) => {
      sections.push(`## 子 Agent ${index + 1}: ${result.task}\n`);
      sections.push(`**状态**: ${result.status === "completed" ? "✅ 完成" : "❌ 失败"}\n`);

      if (result.status === "completed" && result.messages.length > 0) {
        sections.push("**结果**:\n");
        result.messages.forEach((msg) => {
          msg.parts.forEach((part) => {
            if (typeof part === "object" && part !== null && "text" in part) {
              sections.push(`${(part as { text: string }).text}\n`);
            }
          });
        });
      }

      if (result.error) {
        sections.push(`**错误**: ${result.error}\n`);
      }

      sections.push("\n---\n");
    });

    return sections.join("\n");
  }

  /**
   * Start a new execution cycle
   */
  startNewCycle(): void {
    this.cycleManager.startNewCycle();
    const cycleNumber = this.cycleManager.getCycleNumber();
    console.log(
      `[Orchestrator/${this.config.requestId}] Starting cycle ${cycleNumber}`
    );
    this.emit("cycle-start");
  }

  /**
   * Complete current cycle
   */
  completeCycle(): void {
    const cycleNumber = this.cycleManager.getCycleNumber();
    console.log(
      `[Orchestrator/${this.config.requestId}] Cycle ${cycleNumber} completed`
    );
    this.emit("cycle-complete");
  }

  /**
   * Complete orchestration
   */
  complete(): void {
    this.cycleManager.complete();
    console.log(
      `[Orchestrator/${this.config.requestId}] Orchestration completed`
    );
    this.emit("all-complete");
  }

  /**
   * Get current cycle number
   */
  getCycleNumber(): number {
    return this.cycleManager.getCycleNumber();
  }

  /**
   * Get current state
   */
  getState() {
    return this.cycleManager.getState();
  }
}
