/**
 * Sub-Agent Manager
 *
 * Global singleton for managing sub-agent lifecycle, task queue, and event dispatch.
 */

import type {
  SubAgentTask,
  SubAgentProgress,
  CreateSubAgentTaskInput,
  CreateSubAgentTaskOutput,
} from "./types";
import { executeSubAgentTask } from "./executor";
import { ChunkConverter } from "../chunk-converter";

interface TaskCompletionSignal {
  promise: Promise<void>;
  resolve: () => void;
  settled: boolean;
}

/**
 * Sub-Agent Manager
 *
 * Responsibilities:
 * 1. Receive sub-agent tasks (via tool call)
 * 2. Schedule execution
 * 3. Manage task status
 * 4. Event notification (SSE push)
 */
export class SubAgentManager {
  private static instance: SubAgentManager;

  /**
   * Task completion signal for event-driven orchestration wait.
   * A task resolves once it reaches a terminal state (completed/failed).
   */
  private completionSignals = new Map<string, TaskCompletionSignal>();

  /** Task storage */
  private tasks = new Map<string, SubAgentTask>();

  /** Abort controllers for cancellation */
  private abortControllers = new Map<string, AbortController>();

  /** Event listeners for SSE push */
  private listeners = new Set<(progress: SubAgentProgress) => void>();

  /** Session ID to tasks mapping */
  private sessionTasks = new Map<string, Set<string>>();

  private chunkConverter = new ChunkConverter();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SubAgentManager {
    if (!SubAgentManager.instance) {
      SubAgentManager.instance = new SubAgentManager();
    }
    return SubAgentManager.instance;
  }

  /**
   * Add task to queue (used when tool is called)
   *
   * Immediately returns task ID, executes in background.
   */
  addTask(
    input: CreateSubAgentTaskInput,
    sessionId: string
  ): CreateSubAgentTaskOutput {
    const id = `subagent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const streamId = `subagent-${id}`;

    const task: SubAgentTask = {
      ...input,
      id,
      parentId: sessionId,
      status: "pending",
      createdAt: new Date(),
      streamId,
    };

    this.tasks.set(id, task);
    this.createCompletionSignal(id);

    // Track session-task relationship
    this.ensureSessionTaskSet(sessionId).add(id);

    // Execute asynchronously in background
    this.executeTask(task);

    return {
      taskId: id,
      status: "launched",
      message: `子 Agent 已启动 (ID: ${id.slice(0, 12)}...), 正在处理 ${input.repos.length} 个仓库`,
      reposCount: input.repos.length,
      async: true as const,
      subAgent: {
        profileId: input.profileId,
        templateId: input.templateId,
        profileVersion: input.profileVersion,
        originTool: input.originTool,
      },
    };
  }

  /**
   * Execute task in background
   */
  private async executeTask(task: SubAgentTask): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(task.id, controller);

    task.status = "running";
    task.startedAt = new Date();

    this.notify({
      taskId: task.id,
      type: "start",
      progress: 0,
      subAgent: {
        profileId: task.profileId,
        templateId: task.templateId,
        profileVersion: task.profileVersion,
        originTool: task.originTool,
      },
    });

    try {
      // Execute using the executor
      await executeSubAgentTask(
        task,
        (progress) => this.notify(progress),
        controller.signal
      );

      task.status = "completed";
      task.progress = 100;
      task.completedAt = new Date();

      this.notify({
        taskId: task.id,
        type: "complete",
        progress: 100,
        result: task.result,
        subAgent: {
          profileId: task.profileId,
          templateId: task.templateId,
          profileVersion: task.profileVersion,
          originTool: task.originTool,
        },
      });
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : "Unknown error";
      task.completedAt = new Date();

      this.notify({
        taskId: task.id,
        type: "error",
        error: task.error,
        progress: task.progress,
        subAgent: {
          profileId: task.profileId,
          templateId: task.templateId,
          profileVersion: task.profileVersion,
          originTool: task.originTool,
        },
      });
    } finally {
      this.abortControllers.delete(task.id);
      this.resolveCompletionSignal(task.id);
    }
  }

  private createCompletionSignal(taskId: string): void {
    if (this.completionSignals.has(taskId)) {
      return;
    }

    let resolveFn: (() => void) | null = null;
    const signal: TaskCompletionSignal = {
      settled: false,
      promise: new Promise<void>((resolve) => {
        resolveFn = () => {
          if (signal.settled) {
            return;
          }
          signal.settled = true;
          resolve();
        };
      }),
      resolve: () => {
        resolveFn?.();
      },
    };

    this.completionSignals.set(taskId, signal);
  }

  private ensureSessionTaskSet(sessionId: string): Set<string> {
    const existing = this.sessionTasks.get(sessionId);
    if (existing) {
      return existing;
    }
    const created = new Set<string>();
    this.sessionTasks.set(sessionId, created);
    return created;
  }

  private resolveCompletionSignal(taskId: string): void {
    const signal = this.completionSignals.get(taskId);
    signal?.resolve();
  }

  /**
   * Wait until a task reaches terminal state (completed/failed).
   */
  async waitForTaskCompletion(taskId: string): Promise<SubAgentTask | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }
    if (task.status === "completed" || task.status === "failed") {
      return task;
    }

    this.createCompletionSignal(taskId);
    const signal = this.completionSignals.get(taskId);
    await signal?.promise;
    return this.tasks.get(taskId);
  }

  /**
   * Register event listener (for SSE push)
   */
  subscribe(listener: (progress: SubAgentProgress) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notify(progress: SubAgentProgress): void {
    if (progress.type === "message-chunk" && progress.chunk) {
      const task = this.tasks.get(progress.taskId);
      if (task) {
        const conversion = this.chunkConverter.processChunk(progress.taskId, progress.chunk);
        if (conversion.isFinalized && conversion.message) {
          task.messages = [conversion.message];
          const textParts = conversion.message.parts
            .filter((part) => typeof part === "object" && part !== null && "type" in part && (part as { type: string }).type === "text")
            .map((part) => (part as { text: string }).text)
            .join("\n")
            .trim();
          if (textParts) {
            task.result = textParts;
          }
        }
      }
    }

    this.listeners.forEach((listener) => {
      try {
        listener(progress);
      } catch (error) {
        console.error("Error in sub-agent progress listener:", error);
      }
    });
  }

  /**
   * Get task by ID
   */
  getTask(id: string): SubAgentTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): SubAgentTask[] {
    return [...this.tasks.values()];
  }

  /**
   * Get completed tasks by IDs
   */
  getCompletedTasks(taskIds: string[]): SubAgentTask[] {
    return taskIds
      .map((id) => this.tasks.get(id))
      .filter(
        (task): task is SubAgentTask =>
          task !== undefined
          && (task.status === "completed" || task.status === "failed")
      );
  }

  /**
   * Check if all tasks are completed
   */
  areTasksCompleted(taskIds: string[]): boolean {
    return taskIds.every((id) => {
      const task = this.tasks.get(id);
      return task && (task.status === "completed" || task.status === "failed");
    });
  }

  /**
   * Get tasks by session ID
   */
  getTasksBySession(sessionId: string): SubAgentTask[] {
    const taskIds = this.sessionTasks.get(sessionId);
    if (!taskIds)
      return [];

    return Array.from(taskIds, (id) => this.tasks.get(id))
      .filter((task): task is SubAgentTask => task !== undefined);
  }

  /**
   * Check whether a task belongs to a specific session
   */
  isTaskInSession(taskId: string, sessionId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }
    return task.parentId === sessionId;
  }

  /**
   * Abort task
   */
  abortTask(id: string): void {
    const controller = this.abortControllers.get(id);
    if (controller) {
      controller.abort();
    }
    const task = this.tasks.get(id);
    if (task) {
      task.status = "failed";
      task.error = "Aborted by user";
    }
    this.resolveCompletionSignal(id);
  }

  /**
   * Abort all tasks for a session
   */
  abortSessionTasks(sessionId: string): void {
    const taskIds = this.sessionTasks.get(sessionId);
    if (!taskIds)
      return;

    taskIds.forEach((id) => this.abortTask(id));
  }

  /**
   * Clean up completed/failed tasks (older than specified minutes)
   */
  cleanup(olderThanMinutes: number = 30): void {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    this.tasks.forEach((task, id) => {
      if (
        (task.status === "completed" || task.status === "failed")
        && (task.completedAt || task.createdAt) < cutoff
      ) {
        this.tasks.delete(id);
        this.completionSignals.delete(id);

        // Clean up session mapping
        this.sessionTasks.forEach((taskIds) => {
          taskIds.delete(id);
        });
      }
    });

    // Clean empty session sets
    this.sessionTasks.forEach((taskIds, sessionId) => {
      if (taskIds.size === 0) {
        this.sessionTasks.delete(sessionId);
      }
    });
  }
}

/**
 * Get SubAgentManager instance (convenience function)
 */
export function getSubAgentManager(): SubAgentManager {
  return SubAgentManager.getInstance();
}
