import type { UIMessage } from "ai";
import type { MessageShareFilterInput, SharedMessage, SharedMessagePart } from "./types";

interface RoomUIPart {
  type?: string;
  text?: string;
  state?: string;
  errorText?: string;
}

function toVisiblePart(rawPart: unknown): SharedMessagePart | null {
  if (!rawPart || typeof rawPart !== "object") {
    return null;
  }

  const part = rawPart as RoomUIPart;

  if (part.type === "text") {
    const text = typeof part.text === "string" ? part.text.trim() : "";
    if (!text) {
      return null;
    }
    return { type: "text", text };
  }

  if (part.type === "reasoning") {
    return null;
  }

  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    const toolName = part.type.replace("tool-", "");
    const state = typeof part.state === "string" ? part.state : "output-available";

    if (state === "output-error") {
      const errorText = typeof part.errorText === "string"
        ? part.errorText
        : "工具执行失败";
      return {
        type: "tool-summary",
        text: `[工具 ${toolName}] ${errorText}`,
      };
    }

    if (state === "output-available") {
      return {
        type: "tool-summary",
        text: `[工具 ${toolName}] 已完成输出`,
      };
    }
  }

  return null;
}

export function filterToSharedMessage(input: MessageShareFilterInput): SharedMessage | null {
  const visibleParts = input.message.parts
    .map(part => toVisiblePart(part))
    .filter((part): part is SharedMessagePart => part !== null);

  if (visibleParts.length === 0) {
    return null;
  }

  return {
    id: input.message.id,
    roomId: input.roomId,
    turnNo: input.turnNo,
    actorType: input.actorType,
    actorId: input.actorId,
    actorName: input.actorName,
    visibleParts,
    renderParts: [...visibleParts],
    createdAt: input.createdAt,
    metadata: {
      sourceMessageId: input.message.id,
    },
  };
}

export function createTextSharedMessage(input: {
  roomId: string;
  turnNo: number;
  actorType: "user" | "character" | "playwright" | "system";
  actorId: string;
  actorName: string;
  text: string;
  createdAt: string;
  id: string;
  metadata?: SharedMessage["metadata"];
}): SharedMessage {
  return {
    id: input.id,
    roomId: input.roomId,
    turnNo: input.turnNo,
    actorType: input.actorType,
    actorId: input.actorId,
    actorName: input.actorName,
    visibleParts: [{ type: "text", text: input.text.trim() }],
    renderParts: [{ type: "text", text: input.text.trim() }],
    createdAt: input.createdAt,
    metadata: {
      sourceMessageId: input.id,
      ...input.metadata,
    },
  };
}

export function sharedMessageText(message: SharedMessage): string {
  return message.visibleParts.map(part => part.text).join("\n").trim();
}

export function createAssistantUIMessageFromText(text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}
