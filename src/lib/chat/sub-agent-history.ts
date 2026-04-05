import { chunksToMessage } from "@/lib/agents/chunk-converter";
import type { SubAgentCard } from "@/types/agent";
import type { LanguageModelUsage, UIMessage } from "ai";

interface SubAgentMessageSnapshot {
  taskId: string;
  task: string;
  status: "running" | "completed" | "failed";
  finalResult?: string;
  error?: string;
}

export interface SubAgentHistoryState {
  cards: Map<string, SubAgentCard>;
  messages: Map<string, UIMessage[]>;
}

export interface BuildSubAgentHistoryOptions {
  isChatLoading: boolean;
}

function extractUsageFromChunk(chunk: unknown): LanguageModelUsage | undefined {
  if (!chunk || typeof chunk !== "object") {
    return undefined;
  }

  const chunkObj = chunk as Record<string, unknown>;
  const messageMetadata = chunkObj.messageMetadata;
  if (messageMetadata && typeof messageMetadata === "object") {
    const totalUsage = (messageMetadata as Record<string, unknown>).totalUsage;
    if (totalUsage && typeof totalUsage === "object") {
      return totalUsage as LanguageModelUsage;
    }
  }

  const totalUsage = chunkObj.totalUsage;
  if (totalUsage && typeof totalUsage === "object") {
    return totalUsage as LanguageModelUsage;
  }

  const usage = chunkObj.usage;
  if (usage && typeof usage === "object") {
    return usage as LanguageModelUsage;
  }

  return undefined;
}

export function buildSubAgentHistoryState(
  messages: UIMessage[],
  options: BuildSubAgentHistoryOptions
): SubAgentHistoryState {
  const { isChatLoading } = options;
  const lastMessageId = messages.at(-1)?.id;
  const nextSnapshots = new Map<string, SubAgentMessageSnapshot>();
  const chunksByTask = new Map<string, unknown[]>();
  const usageByTask = new Map<string, LanguageModelUsage>();
  const progressByTask = new Map<string, {
    progressType: string;
    result?: string;
    error?: string;
  }>();

  for (const message of messages) {
    for (const part of message.parts) {
      if (!part || typeof part !== "object") {
        continue;
      }
      const p = part as Record<string, unknown>;

      const isToolCall = typeof p.type === "string" && p.type.startsWith("tool-");
      const toolOutput = p.output && typeof p.output === "object"
        ? p.output as Record<string, unknown>
        : undefined;
      const hasSubAgentMetadata = Boolean(toolOutput?.subAgent && typeof toolOutput.subAgent === "object");

      if (isToolCall && hasSubAgentMetadata) {
        const output = (p.output && typeof p.output === "object")
          ? p.output as Record<string, unknown>
          : undefined;
        const input = (p.input && typeof p.input === "object")
          ? p.input as Record<string, unknown>
          : undefined;
        const taskId = typeof output?.taskId === "string" ? output.taskId : undefined;
        if (!taskId) {
          continue;
        }
        const task = typeof input?.task === "string" ? input.task : "";
        const partState = typeof p.state === "string" ? p.state : "";
        const isLastStreamingPart = isChatLoading && message.id === lastMessageId && partState !== "output-error";
        const status: SubAgentMessageSnapshot["status"] = partState === "output-error"
          ? "failed"
          : (isLastStreamingPart ? "running" : "completed");

        nextSnapshots.set(taskId, {
          taskId,
          task,
          status,
        });
        continue;
      }

      if (p.type === "tool-result" && p.result && typeof p.result === "object") {
        const result = p.result as Record<string, unknown>;
        const taskId = typeof result.taskId === "string" ? result.taskId : undefined;
        const subAgent = result.subAgent;
        if (!taskId || !subAgent || typeof subAgent !== "object") {
          continue;
        }
        const status: SubAgentMessageSnapshot["status"] = isChatLoading && message.id === lastMessageId
          ? "running"
          : "completed";
        nextSnapshots.set(taskId, {
          taskId,
          task: "",
          status,
        });
        continue;
      }

      if (p.type === "data-subagent" && p.data && typeof p.data === "object") {
        const data = p.data as Record<string, unknown>;
        const taskId = typeof data.taskId === "string" ? data.taskId : undefined;
        const progressType = typeof data.progressType === "string" ? data.progressType : undefined;
        if (!taskId || !progressType) {
          continue;
        }

        if (progressType === "message-chunk" && data.chunk !== undefined) {
          const chunks = chunksByTask.get(taskId) || [];
          chunks.push(data.chunk);
          chunksByTask.set(taskId, chunks);

          const usage = extractUsageFromChunk(data.chunk);
          if (usage) {
            usageByTask.set(taskId, usage);
          }
        } else {
          progressByTask.set(taskId, {
            progressType,
            result: typeof data.result === "string" ? data.result : undefined,
            error: typeof data.error === "string" ? data.error : undefined,
          });
        }
      }
    }
  }

  const restoredMessages = new Map<string, UIMessage[]>();
  chunksByTask.forEach((chunks, taskId) => {
    const restoredMessage = chunksToMessage(chunks);
    const hasRenderableParts = Boolean(restoredMessage && restoredMessage.parts.length > 0);

    // Ignore metadata-only restoration (e.g. persisted finish chunk without text/tool parts).
    // In that case we fallback to finalResult text stored in progress snapshots.
    if (restoredMessage && hasRenderableParts) {
      restoredMessages.set(taskId, [restoredMessage]);
    }
  });

  const hydratedCards = new Map<string, SubAgentCard>();
  const allTaskIds = new Set<string>([
    ...nextSnapshots.keys(),
    ...progressByTask.keys(),
    ...restoredMessages.keys(),
    ...usageByTask.keys(),
  ]);

  allTaskIds.forEach((taskId) => {
    const snapshot = nextSnapshots.get(taskId);
    const progressState = progressByTask.get(taskId);
    const restoredMessage = restoredMessages.get(taskId)?.[0];
    const restoredText = restoredMessage?.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    let status: "pending" | "running" | "completed" | "failed" = snapshot?.status || "completed";
    let finalResult = snapshot?.finalResult;
    let error = snapshot?.error;

    if (progressState) {
      if (progressState.progressType === "error") {
        status = "failed";
        error = progressState.error;
      } else if (progressState.progressType === "complete") {
        status = "completed";
        finalResult = progressState.result || finalResult;
      } else if (progressState.progressType === "start" || progressState.progressType === "progress") {
        status = isChatLoading ? "running" : status;
      }
    }

    if (!finalResult && restoredText) {
      finalResult = restoredText;
    }

    hydratedCards.set(taskId, {
      taskId,
      status,
      task: snapshot?.task || "",
      finalResult,
      error,
      usage: usageByTask.get(taskId),
    });
  });

  return {
    cards: hydratedCards,
    messages: restoredMessages,
  };
}

export function createSubAgentHistorySignature(messages: UIMessage[]): string {
  if (messages.length === 0) {
    return "0";
  }

  const head = messages[0];
  const tail = messages.at(-1)!;
  const tailPart = tail.parts.at(-1);
  const tailPartType = tailPart && typeof tailPart === "object" && "type" in tailPart
    ? String((tailPart as { type?: unknown }).type || "")
    : "";
  const tailPartState = tailPart && typeof tailPart === "object" && "state" in tailPart
    ? String((tailPart as { state?: unknown }).state || "")
    : "";

  return [
    messages.length,
    head.id,
    tail.id,
    tail.parts.length,
    tailPartType,
    tailPartState,
  ].join("|");
}
