import dayjs from "dayjs";
import { DEFAULT_ROOM_CONTEXT_WINDOW } from "../constants";
import type { SharedMessage } from "../types";
import { sharedMessageText } from "../message-share-filter";

function sortByTurn(messages: SharedMessage[]): SharedMessage[] {
  return messages.toSorted((a, b) => {
    if (a.turnNo !== b.turnNo) {
      return a.turnNo - b.turnNo;
    }
    return dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf();
  });
}

export function buildRoomConversationText(
  messages: SharedMessage[],
  windowSize: number = DEFAULT_ROOM_CONTEXT_WINDOW,
): string {
  const sorted = sortByTurn(messages);
  const sliced = sorted.slice(Math.max(0, sorted.length - windowSize));

  return sliced
    .map((message) => `[${message.actorName}] ${sharedMessageText(message)}`)
    .join("\n");
}

export function resolveNextTurnNo(messages: SharedMessage[]): number {
  if (messages.length === 0) {
    return 1;
  }

  const lastTurnNo = Math.max(...messages.map(message => message.turnNo));
  return lastTurnNo + 1;
}
