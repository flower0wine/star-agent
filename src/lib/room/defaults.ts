import dayjs from "dayjs";
import { nanoid } from "nanoid";
import { DEFAULT_PLAYWRIGHT_NAME } from "./constants";
import type { RoomConfig, RoomTurnState } from "./types";

function defaultCharacterPrompt(name: string): string {
  return [
    `你是角色 ${name}。`,
    "保持鲜明个性和稳定价值观。",
    "你的表达应当推动剧情冲突与情节发展，而不是平铺直叙。",
    "避免重复前文句式，保持语言节奏变化。",
  ].join("\n");
}

export function createDefaultRoomConfig(roomId: string): RoomConfig {
  const now = Date.now();

  return {
    roomId,
    name: `交流室 ${dayjs(now).format("MM-DD HH:mm")}`,
    userDirective: "故事类型、核心价值观、禁忌项、希望的剧情方向。",
    playwright: {
      id: "playwright",
      name: DEFAULT_PLAYWRIGHT_NAME,
      systemPromptTemplate: [
        "你是故事总编剧，负责把控世界观、角色张力与剧情节奏。",
        "在复盘阶段请基于既有对话给出结构化修订，避免流水线叙事。",
      ].join("\n"),
    },
    world: {
      worldPromptTemplate: [
        "世界处于资源稀缺与秩序重建阶段。",
        "不同阵营在理念与利益上持续碰撞，任何选择都有代价。",
      ].join("\n"),
      storyBible: "编剧尚未生成完整世界观档案。",
      plotOutline: "编剧尚未生成情节蓝图。",
    },
    characters: [
      {
        id: "character-1",
        name: "执火者",
        enabled: true,
        order: 1,
        systemPromptTemplate: defaultCharacterPrompt("执火者"),
      },
      {
        id: "character-2",
        name: "巡夜人",
        enabled: true,
        order: 2,
        systemPromptTemplate: defaultCharacterPrompt("巡夜人"),
      },
      {
        id: "character-3",
        name: "织忆师",
        enabled: true,
        order: 3,
        systemPromptTemplate: defaultCharacterPrompt("织忆师"),
      },
    ],
    updatedAt: now,
  };
}

export function createDefaultRoomTurnState(roomId: string): RoomTurnState {
  return {
    roomId,
    cycleNo: 1,
    totalCharacterTurnsInCycle: 0,
    lastSpeakerCharacterId: undefined,
    nextPhase: "character",
    updatedAt: Date.now(),
  };
}

export function createRoomPromptRevisionId(): string {
  return `room-revision-${nanoid()}`;
}
