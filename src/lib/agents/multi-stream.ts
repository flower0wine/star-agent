/**
 * Multi-Stream Merger
 *
 * Merges master agent stream + sub-agent streams into a single SSE response.
 * Uses createUIMessageStream for proper AI SDK integration.
 *
 * ENHANCED: Integrated with AgentOrchestrator for cycle-based execution.
 * Master agent waits for sub-agents to complete, then resumes with results.
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { streamText as StreamTextType, UIMessage } from "ai";

import type { SubAgentProgress } from "./sub-agent/types";
import { getSubAgentManager } from "./sub-agent/manager";
import { AgentOrchestrator, resumeMasterAgent } from "./orchestrator";
import { ChunkConverter } from "./chunk-converter";

/**
 * Master stream configuration for resumption
 */
interface MasterStreamConfig {
  model: Parameters<typeof StreamTextType>[0]["model"];
  tools: Parameters<typeof StreamTextType>[0]["tools"];
  system: Parameters<typeof StreamTextType>[0]["system"];
  initialMessages: UIMessage[];
}

/**
 * Create multi-stream response with orchestration
 *
 * Returns a properly formatted SSE stream that useChat can consume.
 * Implements cycle-based execution: master -> wait for subagents -> resume master.
 */
export async function createMultiStreamResponse(
  masterStream: ReturnType<typeof StreamTextType>,
  requestId: string,
  masterConfig?: MasterStreamConfig
): Promise<Response> {
  const subManager = getSubAgentManager();

  // Create orchestrator
  const orchestrator = new AgentOrchestrator({
    requestId,
    maxCycles: 10,
    subAgentTimeout: 180000, // 3 minutes
  });

  // Track accumulated messages for resumption
  const accumulatedMessages: UIMessage[] = masterConfig?.initialMessages || [];

  // Create the unified stream using AI SDK's createUIMessageStream
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Send initial message
      writer.write({
        type: "start",
      });

      // Subscribe to sub-agent progress
      const progressHandler = (progress: SubAgentProgress) => {
        // Register sub-agent with orchestrator
        if (progress.type === "start") {
          orchestrator.registerSubAgent(progress.taskId);
        }

        // Forward message-chunk directly to the client
        if (progress.type === "message-chunk" && progress.chunk) {
          writer.write({
            type: "data-subagent",
            data: {
              taskId: progress.taskId,
              progressType: progress.type,
              chunk: progress.chunk,
              progress: progress.progress,
            },
          });
          return;
        }

        // Write sub-agent progress as data part (for start, progress, complete, error)
        writer.write({
          type: "data-subagent",
          data: {
            taskId: progress.taskId,
            progressType: progress.type,
            progress: progress.progress,
            error: progress.error,
            result: progress.result,
          },
        });
      };

      const unsubscribe = subManager.subscribe(progressHandler);

      try {
        let currentStream = masterStream;
        let shouldContinue = true;

        // Execution cycle loop
        while (shouldContinue && orchestrator.getCycleNumber() <= 10) {
          const cycleNumber = orchestrator.getCycleNumber();
          console.log(
            `[MultiStream/${requestId}] ===== Cycle ${cycleNumber} Start =====`
          );

          // Phase 1: Stream master agent output until completion
          console.log(
            `[MultiStream/${requestId}] Phase 1: Streaming master output`
          );

          const assistantMessage: UIMessage = {
            id: `assistant-cycle-${cycleNumber}-${Date.now()}`,
            role: "assistant",
            parts: [],
          };

          // Stream and collect master output
          for await (const chunk of currentStream.toUIMessageStream()) {
            // Write master stream chunks directly
            writer.write(chunk);

            // Collect chunks for message history (simplified)
            // In production, you'd want more sophisticated message accumulation
          }

          // Add assistant message to history
          accumulatedMessages.push(assistantMessage);

          orchestrator.notifyMasterComplete();
          console.log(
            `[MultiStream/${requestId}] Master stream completed (Cycle ${cycleNumber})`
          );

          // Phase 2: Wait for all sub-agents to complete
          console.log(
            `[MultiStream/${requestId}] Phase 2: Waiting for sub-agents`
          );

          const subAgentResults = await orchestrator.waitForSubAgents();

          console.log(
            `[MultiStream/${requestId}] Sub-agents completed: ${subAgentResults.length} results`
          );

          orchestrator.completeCycle();

          // Phase 3: Check if we need another cycle
          if (subAgentResults.length === 0) {
            console.log(
              `[MultiStream/${requestId}] No sub-agents created, ending cycles`
            );
            shouldContinue = false;
            break;
          }

          if (!orchestrator.shouldStartNewCycle(subAgentResults)) {
            console.log(
              `[MultiStream/${requestId}] No new cycle needed, ending`
            );
            shouldContinue = false;
            break;
          }

          // Check if master config is available for resumption
          if (!masterConfig) {
            console.log(
              `[MultiStream/${requestId}] Master config not available, cannot resume. Ending cycles.`
            );

            // Send results as data event for frontend display
            const resultsMessage = orchestrator.formatResultsForMaster(subAgentResults);
            writer.write({
              type: "data-subagent-summary",
              data: {
                cycleNumber,
                results: subAgentResults,
                message: resultsMessage,
              },
            });

            shouldContinue = false;
            break;
          }

          // Phase 4: Resume master with sub-agent results
          console.log(
            `[MultiStream/${requestId}] Phase 3: Resuming master with results`
          );

          orchestrator.startNewCycle();

          // Resume master agent with sub-agent results
          currentStream = await resumeMasterAgent({
            model: masterConfig.model,
            tools: masterConfig.tools,
            system: masterConfig.system,
            messages: accumulatedMessages,
            subAgentResults,
            cycleNumber,
          });

          console.log(
            `[MultiStream/${requestId}] Master resumed for cycle ${orchestrator.getCycleNumber()}`
          );
        }

        orchestrator.complete();
        console.log(
          `[MultiStream/${requestId}] ===== All cycles completed =====`
        );
      } finally {
        unsubscribe();
      }
    },
    onFinish: () => {
      console.log(`[MultiStream/${requestId}] Stream finished`);
    },
  });

  // Return properly formatted response
  return createUIMessageStreamResponse({
    stream,
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
