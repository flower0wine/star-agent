import type { UIMessage } from "ai";
import dayjs from "dayjs";
import type { ChatMessageMetadata } from "@/lib/chat/message-metadata";
import type {
  SharedMessage,
  SharedMessagePart,
  SharedMessageRenderPart,
} from "@/lib/room/types";

export type RoomRenderableMessage = UIMessage<ChatMessageMetadata>;

function toTextUIPart(part: SharedMessagePart): { type: "text"; text: string } {
  return {
    type: "text",
    text: part.text,
  };
}

function toRenderUIPart(part: SharedMessageRenderPart) {
  if (part.type === "tool-createCharacter") {
    return {
      type: "tool-createCharacter",
      state: part.state || "output-available",
      input: part.input,
      output: part.output,
      errorText: part.errorText,
    } as const;
  }

  if (part.type === "tool-startRoleCycle") {
    return {
      type: "tool-startRoleCycle",
      state: part.state || "output-available",
      input: part.input,
      output: part.output,
      errorText: part.errorText,
    } as const;
  }

  if (part.type === "reasoning") {
    return {
      type: "reasoning" as const,
      text: part.text || "",
      state: "done" as const,
    };
  }

  return {
    type: "text" as const,
    text: part.text || "",
  };
}

export function toRoomRenderableMessage(message: SharedMessage): RoomRenderableMessage {
  const renderParts = message.renderParts?.length
    ? message.renderParts.map(toRenderUIPart)
    : message.visibleParts.map(toTextUIPart);

  return {
    id: message.id,
    role: message.actorType === "user" ? "user" : "assistant",
    parts: renderParts as any,
  };
}

export function formatRoomMessageMeta(message: SharedMessage): string {
  return `T${message.turnNo} · ${dayjs(message.createdAt).format("MM-DD HH:mm:ss")}`;
}
