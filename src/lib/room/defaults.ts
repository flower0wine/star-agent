import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { DEFAULT_PLAYWRIGHT_NAME } from "./constants";
import type { RoomConfig, RoomTurnState } from "./types";

export function createDefaultRoomConfig(roomId: string): RoomConfig {
  const now = Date.now();

  return {
    roomId,
    name: `交流室 ${dayjs(now).format("MM-DD HH:mm")}`,
    userDirective: "题材：悬疑奇幻；价值观：责任与自由并行；禁忌：避免脸谱化反派；期待：多线冲突与高张力反转。",
    playwright: {
      id: "playwright",
      name: DEFAULT_PLAYWRIGHT_NAME,
      systemPromptTemplate: [
        "你是故事总编剧，负责把控世界观、角色张力与剧情节奏。",
        "在复盘阶段请基于既有对话给出结构化修订，避免流水线叙事。",
      ].join("\n"),
    },
    world: {
      worldPromptTemplate: "",
      playwrightOutput: "",
    },
    characters: [],
    updatedAt: now,
  };
}

export function createDefaultRoomTurnState(roomId: string): RoomTurnState {
  return {
    roomId,
    cycleNo: 1,
    totalCharacterTurnsInCycle: 0,
    lastSpeakerCharacterId: undefined,
    cycleArmed: false,
    nextPhase: "playwright",
    updatedAt: Date.now(),
  };
}

export function createRoomPromptRevisionId(): string {
  return `room-revision-${nanoid()}`;
}
