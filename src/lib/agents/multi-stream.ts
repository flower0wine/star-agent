/**
 * Multi-Stream Merger
 *
 * Merges master agent stream + sub-agent streams into a single SSE response.
 * Uses createUIMessageStream for proper AI SDK integration.
 */

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText

} from "ai";
import type { streamText as StreamTextType } from "ai";
import type { SubAgentProgress } from "./sub-agent/types";
import { getSubAgentManager } from "./sub-agent/manager";

/**
 * Create multi-stream response
 *
 * Returns a properly formatted SSE stream that useChat can consume.
 */
export async function createMultiStreamResponse(
  masterStream: ReturnType<typeof StreamTextType>,
  requestId: string
): Promise<Response> {
  console.log(`[MultiStream/${requestId}] Starting multi-stream with createUIMessageStream...`);

  const subManager = getSubAgentManager();

  // Track state for waiting
  const state = {
    masterDone: false,
    subAgentTaskIds: new Set<string>(),
  };

  // Create the unified stream using AI SDK's createUIMessageStream
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      console.log(`[MultiStream/${requestId}] Stream execution started`);

      // Send initial message
      writer.write({
        type: "start",
      });

      // Subscribe to sub-agent progress
      const progressHandler = (progress: SubAgentProgress) => {
        if (progress.type === "start") {
          state.subAgentTaskIds.add(progress.taskId);
        }

        // Forward message-chunk directly to the client
        if (progress.type === "message-chunk" && progress.chunk) {
          console.log(`[MultiStream/${requestId}] Writing data-subagent chunk:`, {
            taskId: progress.taskId,
            progressType: progress.type,
            chunkType: (progress.chunk as Record<string, unknown>)?.type,
          });
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
        // Merge master agent stream
        console.log(`[MultiStream/${requestId}] Merging master stream...`);

        // Process master stream and wait for completion
        for await (const chunk of masterStream.toUIMessageStream()) {
          // Write master stream chunks directly
          writer.write(chunk);
        }

        state.masterDone = true;
        console.log(`[MultiStream/${requestId}] Master stream done`);

        // Wait for sub-agents to complete (with timeout)
        const maxWaitMs = 180000; // 3 minutes
        const startWait = Date.now();

        while (state.subAgentTaskIds.size > 0 || !state.masterDone) {
          if (Date.now() - startWait > maxWaitMs) {
            console.log(`[MultiStream/${requestId}] Timeout waiting for sub-agents`);
            break;
          }

          const tasks = subManager.getAllTasks();
          const active = tasks.filter(
            (t) => t.status === "running" || t.status === "pending"
          );

          if (active.length === 0 && state.masterDone) {
            break;
          }

          await new Promise((r) => setTimeout(r, 500));
        }

        console.log(
          `[MultiStream/${requestId}] All done, subAgentTasks: ${state.subAgentTaskIds.size}`
        );
      } finally {
        unsubscribe();
        console.log(`[MultiStream/${requestId}] Unsubscribed progress handler`);
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
