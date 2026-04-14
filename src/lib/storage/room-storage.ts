import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { getDB } from "./db";
import type {
  RoomConfigRecord,
  RoomMessageRecord,
  RoomPromptRevisionRecord,
  RoomRecord,
  RoomTurnStateRecord,
} from "./db";
import type {
  RoomConfig,
  RoomPromptRevision,
  RoomTurnState,
  SharedMessage,
} from "@/lib/room/types";
import {
  createDefaultRoomConfig,
  createDefaultRoomTurnState,
} from "@/lib/room/defaults";

function messageToRecord(message: SharedMessage): RoomMessageRecord {
  return {
    id: message.id,
    roomId: message.roomId,
    turnNo: message.turnNo,
    actorType: message.actorType,
    actorId: message.actorId,
    actorName: message.actorName,
    visibleParts: message.visibleParts,
    metadata: message.metadata,
    createdAt: dayjs(message.createdAt).valueOf(),
  };
}

function recordToMessage(record: RoomMessageRecord): SharedMessage {
  return {
    id: record.id,
    roomId: record.roomId,
    turnNo: record.turnNo,
    actorType: record.actorType,
    actorId: record.actorId,
    actorName: record.actorName,
    visibleParts: record.visibleParts,
    metadata: record.metadata,
    createdAt: dayjs(record.createdAt).toISOString(),
  };
}

function revisionToRecord(revision: RoomPromptRevision): RoomPromptRevisionRecord {
  return {
    id: revision.id,
    roomId: revision.roomId,
    cycleNo: revision.cycleNo,
    worldPromptTemplate: revision.worldPromptTemplate,
    storyBible: revision.storyBible,
    plotOutline: revision.plotOutline,
    characterPromptPatches: revision.characterPromptPatches,
    rationale: revision.rationale,
    createdAt: dayjs(revision.createdAt).valueOf(),
  };
}

function recordToRevision(record: RoomPromptRevisionRecord): RoomPromptRevision {
  return {
    id: record.id,
    roomId: record.roomId,
    cycleNo: record.cycleNo,
    worldPromptTemplate: record.worldPromptTemplate,
    storyBible: record.storyBible || "",
    plotOutline: record.plotOutline || "",
    characterPromptPatches: record.characterPromptPatches,
    rationale: record.rationale,
    createdAt: dayjs(record.createdAt).toISOString(),
  };
}

export async function createRoom(name?: string): Promise<RoomRecord> {
  const db = await getDB();
  const now = Date.now();
  const room: RoomRecord = {
    id: `room-${nanoid()}`,
    name: name?.trim() || `交流室 ${dayjs(now).format("MM-DD HH:mm")}`,
    createdAt: now,
    updatedAt: now,
  };

  await db.put("rooms", room);

  const config = createDefaultRoomConfig(room.id);
  const turnState = createDefaultRoomTurnState(room.id);

  await db.put("roomConfigs", {
    roomId: room.id,
    config,
    updatedAt: now,
  } satisfies RoomConfigRecord);

  await db.put("roomTurnStates", {
    roomId: room.id,
    state: turnState,
    updatedAt: now,
  } satisfies RoomTurnStateRecord);

  return room;
}

export async function ensureRoom(roomId: string, name?: string): Promise<RoomRecord> {
  const db = await getDB();
  const existing = await db.get("rooms", roomId);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const room: RoomRecord = {
    id: roomId,
    name: name?.trim() || `交流室 ${dayjs(now).format("MM-DD HH:mm")}`,
    createdAt: now,
    updatedAt: now,
  };

  await db.put("rooms", room);

  const config = createDefaultRoomConfig(room.id);
  const turnState = createDefaultRoomTurnState(room.id);

  await db.put("roomConfigs", {
    roomId: room.id,
    config,
    updatedAt: now,
  } satisfies RoomConfigRecord);

  await db.put("roomTurnStates", {
    roomId: room.id,
    state: turnState,
    updatedAt: now,
  } satisfies RoomTurnStateRecord);

  return room;
}

export async function getRoom(roomId: string): Promise<RoomRecord | undefined> {
  const db = await getDB();
  return db.get("rooms", roomId);
}

export async function listRooms(): Promise<RoomRecord[]> {
  const db = await getDB();
  const rooms = await db.getAllFromIndex("rooms", "by-updated");
  return rooms.reverse();
}

export async function upsertRoomConfig(config: RoomConfig): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  await db.put("roomConfigs", {
    roomId: config.roomId,
    config,
    updatedAt: now,
  } satisfies RoomConfigRecord);

  const room = await db.get("rooms", config.roomId);
  if (room) {
    await db.put("rooms", {
      ...room,
      name: config.name,
      updatedAt: now,
    });
  }
}

export async function getRoomConfig(roomId: string): Promise<RoomConfig> {
  const db = await getDB();
  const existing = await db.get("roomConfigs", roomId);

  if (existing?.config) {
    return existing.config as RoomConfig;
  }

  const fallback = createDefaultRoomConfig(roomId);
  await db.put("roomConfigs", {
    roomId,
    config: fallback,
    updatedAt: Date.now(),
  } satisfies RoomConfigRecord);
  return fallback;
}

export async function upsertRoomTurnState(state: RoomTurnState): Promise<void> {
  const db = await getDB();
  await db.put("roomTurnStates", {
    roomId: state.roomId,
    state,
    updatedAt: Date.now(),
  } satisfies RoomTurnStateRecord);
}

export async function getRoomTurnState(roomId: string): Promise<RoomTurnState> {
  const db = await getDB();
  const existing = await db.get("roomTurnStates", roomId);

  if (existing?.state) {
    return existing.state as RoomTurnState;
  }

  const fallback = createDefaultRoomTurnState(roomId);
  await db.put("roomTurnStates", {
    roomId,
    state: fallback,
    updatedAt: Date.now(),
  } satisfies RoomTurnStateRecord);
  return fallback;
}

export async function appendRoomMessage(message: SharedMessage): Promise<void> {
  const db = await getDB();
  await db.put("roomMessages", messageToRecord(message));

  const room = await db.get("rooms", message.roomId);
  if (room) {
    await db.put("rooms", {
      ...room,
      updatedAt: Date.now(),
    });
  }
}

export async function appendRoomMessages(messages: SharedMessage[]): Promise<void> {
  if (messages.length === 0) {
    return;
  }

  const db = await getDB();
  const tx = db.transaction("roomMessages", "readwrite");
  for (const message of messages) {
    await tx.store.put(messageToRecord(message));
  }
  await tx.done;

  const roomId = messages[0].roomId;
  const room = await db.get("rooms", roomId);
  if (room) {
    await db.put("rooms", {
      ...room,
      updatedAt: Date.now(),
    });
  }
}

export async function getRoomMessages(roomId: string): Promise<SharedMessage[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex("roomMessages", "by-room", roomId);

  return records
    .sort((a, b) => {
      if (a.turnNo !== b.turnNo) {
        return a.turnNo - b.turnNo;
      }
      return a.createdAt - b.createdAt;
    })
    .map(recordToMessage);
}

export async function saveRoomPromptRevision(revision: RoomPromptRevision): Promise<void> {
  const db = await getDB();
  await db.put("roomPromptRevisions", revisionToRecord(revision));
}

export async function getRoomPromptRevisions(roomId: string): Promise<RoomPromptRevision[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex("roomPromptRevisions", "by-room", roomId);
  return records
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(recordToRevision);
}
