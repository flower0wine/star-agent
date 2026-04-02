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
import {
  AgentOrchestrator,
  createResumptionMessage,
  resumeMasterAgent,
} from "./orchestrator";
import {
  createConverterState,
  processChunk as processAssistantChunk,
} from "@/lib/agents/chunk-converter";
import { buildChatMessageMetadata } from "@/lib/chat/message-metadata";

/**
 * Master stream configuration for resumption
 */
interface MasterStreamConfig {
  model: Parameters<typeof StreamTextType>[0]["model"];
  tools: Parameters<typeof StreamTextType>[0]["tools"];
  system: Parameters<typeof StreamTextType>[0]["system"];
  initialMessages: UIMessage[];
}

const MAX_ORCHESTRATION_CYCLES = 10;

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
    maxCycles: MAX_ORCHESTRATION_CYCLES,
    subAgentTimeout: 180000, // 3 minutes
  });

  // Track accumulated messages for resumption
  const accumulatedMessages: UIMessage[] = masterConfig?.initialMessages || [];

  // Create the unified stream using AI SDK's createUIMessageStream
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Subscribe to sub-agent progress
      const progressHandler = (progress: SubAgentProgress) => {
        // Ignore tasks from other requests/sessions to prevent cross-stream blocking.
        if (!subManager.isTaskInSession(progress.taskId, requestId)) {
          return;
        }
        const task = subManager.getTask(progress.taskId);
        const taskText = task?.task;

        // Register sub-agent with orchestrator
        if (progress.type === "start") {
          orchestrator.registerSubAgent(progress.taskId);
        }

        // Forward message-chunk directly to the client
        if (progress.type === "message-chunk" && progress.chunk) {
          writer.write({
            type: "data-subagent",
            transient: true,
            data: {
              taskId: progress.taskId,
              task: taskText,
              progressType: progress.type,
              chunk: progress.chunk,
              progress: progress.progress,
            },
          });
          return;
        }

        const isHighFrequencyProgress
          = progress.type === "start" || progress.type === "progress";

        // Write sub-agent progress as data part (for start, progress, complete, error)
        writer.write({
          type: "data-subagent",
          transient: isHighFrequencyProgress,
          data: {
            taskId: progress.taskId,
            task: taskText,
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

        // Execution cycle loop (bounded)
        for (let cycleAttempt = 0; cycleAttempt < MAX_ORCHESTRATION_CYCLES; cycleAttempt++) {
          const cycleNumber = orchestrator.getCycleNumber();
          const cycleStartedAt = new Date().toISOString();
          console.log(
            `[MultiStream/${requestId}] ===== Cycle ${cycleNumber} Start =====`
          );

          // Phase 1: Stream master agent output until completion
          console.log(
            `[MultiStream/${requestId}] Phase 1: Streaming master output`
          );

          let assistantMessage: UIMessage = {
            id: `assistant-cycle-${cycleNumber}-${Date.now()}`,
            role: "assistant",
            parts: [],
          };
          const converterState = createConverterState();

          // Stream and collect master output
          for await (const chunk of currentStream.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type !== "finish") {
                return undefined;
              }

              const cycleFinishedAt = new Date().toISOString();
              const metadata = buildChatMessageMetadata({
                totalUsage: part.totalUsage,
                startedAt: cycleStartedAt,
                finishedAt: cycleFinishedAt,
              });

              console.log(`[MultiStream/${requestId}] Cycle ${cycleNumber} metrics:`, metadata);
              return metadata;
            },
          })) {
            // Write master stream chunks directly
            writer.write(chunk);

            const conversion = processAssistantChunk(chunk, converterState);
            if (conversion.isFinalized && conversion.message) {
              assistantMessage = conversion.message;
            }
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
            break;
          }

          if (!orchestrator.shouldStartNewCycle(subAgentResults)) {
            console.log(
              `[MultiStream/${requestId}] No new cycle needed, ending`
            );
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

            break;
          }

          // Phase 4: Resume master with sub-agent results
          console.log(
            `[MultiStream/${requestId}] Phase 3: Resuming master with results`
          );

          orchestrator.startNewCycle();

          // Keep accumulated history consistent across cycles.
          // resumeMasterAgent appends this message internally for the next stream,
          // but we also need it in accumulatedMessages for subsequent resumes.
          const resumptionMessage = createResumptionMessage(subAgentResults, cycleNumber);
          accumulatedMessages.push(resumptionMessage);

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
