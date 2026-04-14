const ROOM_LOCKS = new Map<string, number>();

const ROOM_LOCK_TTL_MS = 90_000;

export function acquireRoomLock(roomId: string): boolean {
  const now = Date.now();
  const lockAt = ROOM_LOCKS.get(roomId);

  if (lockAt && now - lockAt < ROOM_LOCK_TTL_MS) {
    return false;
  }

  ROOM_LOCKS.set(roomId, now);
  return true;
}

export function releaseRoomLock(roomId: string): void {
  ROOM_LOCKS.delete(roomId);
}
