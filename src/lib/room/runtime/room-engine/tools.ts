import { tool } from "ai";
import { z } from "zod";
import type { RoomConfig, RoomGenerationRequest, RoomTurnState } from "../../types";

const MAX_ROOM_CHARACTERS = 10;
const ROOM_CHARACTER_NAME_MAX_LENGTH = 24;
const CHINESE_NAME_PATTERN = /^[\p{Script=Han}·]{2,12}$/u;

const createCharacterToolInputSchema = z.object({
  name: z.string().trim().min(2).max(ROOM_CHARACTER_NAME_MAX_LENGTH),
  personalityTraits: z.array(z.string().trim().min(1).max(36)).min(2).max(6),
  coreValues: z.array(z.string().trim().min(1).max(36)).min(2).max(5),
  distinctiveTraits: z.array(z.string().trim().min(1).max(36)).min(2).max(5),
  speakingStyle: z.string().trim().min(6).max(120),
  motivation: z.string().trim().min(6).max(180),
  worldview: z.string().trim().min(6).max(180),
  conflictLine: z.string().trim().min(6).max(120),
});

interface CreateCharacterToolResult {
  status: "created" | "rejected";
  message: string;
  characterId?: string;
  characterName?: string;
  __duration?: number;
}

interface StartRoleCycleToolResult {
  status: "started" | "rejected";
  message: string;
  cycleNo?: number;
  nextPhase?: RoomTurnState["nextPhase"];
  __duration?: number;
}

function normalizeCharacterName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function isChineseCharacterName(name: string): boolean {
  return CHINESE_NAME_PATTERN.test(name);
}

function buildCharacterPromptTemplate(input: z.infer<typeof createCharacterToolInputSchema>): string {
  return [
    `你是角色 ${input.name}。`,
    `核心性格：${input.personalityTraits.join("、")}。`,
    `价值观底层：${input.coreValues.join("、")}。`,
    `角色特点：${input.distinctiveTraits.join("、")}。`,
    `表达风格：${input.speakingStyle}。`,
    `核心动机：${input.motivation}。`,
    `世界观立场：${input.worldview}。`,
    `冲突底线：${input.conflictLine}。`,
    "始终保持角色一致性，避免脱离设定或复述系统规则。",
    "角色输出必须为简体中文。",
  ].join("\n");
}

export function createPlaywrightControlTools(input: {
  roomConfig: RoomConfig;
  turnState: RoomTurnState;
  requestId: string;
  roomId: string;
}) {
  let nextRoomConfig = input.roomConfig;
  let nextTurnState = input.turnState;
  const toolRenderParts: RoomGenerationRequest["sharedMessages"][number]["renderParts"] = [];

  return {
    tools: {
      createCharacter: tool({
        description: [
          "创建一个新角色并加入交流室。",
          "角色名称必须为中文名称（仅中文字符，可包含·）。",
          `角色上限为 ${MAX_ROOM_CHARACTERS}，名称不可重复。`,
        ].join(" "),
        inputSchema: createCharacterToolInputSchema,
        execute: async (toolInput): Promise<CreateCharacterToolResult> => {
          const startedAt = Date.now();
          const name = normalizeCharacterName(toolInput.name);
          let result: CreateCharacterToolResult;

          if (!isChineseCharacterName(name)) {
            result = {
              status: "rejected",
              message: "角色名称必须使用中文（2-12字，可包含·），请重新命名。",
            };
          } else if (nextRoomConfig.characters.length >= MAX_ROOM_CHARACTERS) {
            result = {
              status: "rejected",
              message: `当前角色已达上限 ${MAX_ROOM_CHARACTERS}，请先复用或精简现有角色。`,
            };
          } else {
            const duplicated = nextRoomConfig.characters.some((character) =>
              character.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
            );
            if (duplicated) {
              result = {
                status: "rejected",
                message: `角色名“${name}”已存在，请更换名称。`,
              };
            } else {
              const highestOrder = nextRoomConfig.characters.length === 0
                ? 0
                : Math.max(...nextRoomConfig.characters.map(character => character.order));
              const characterId = `character-${crypto.randomUUID().slice(0, 8)}`;

              nextRoomConfig = {
                ...nextRoomConfig,
                characters: [
                  ...nextRoomConfig.characters,
                  {
                    id: characterId,
                    name,
                    enabled: true,
                    order: highestOrder + 1,
                    systemPromptTemplate: buildCharacterPromptTemplate({
                      ...toolInput,
                      name,
                    }),
                  },
                ],
                updatedAt: Date.now(),
              };

              console.log(`[${input.requestId}] playwright created character`, {
                roomId: input.roomId,
                characterId,
                name,
              });

              result = {
                status: "created",
                message: `角色 ${name} 已加入并启用。`,
                characterId,
                characterName: name,
              };
            }
          }

          const withDuration = {
            ...result,
            __duration: Date.now() - startedAt,
          };
          toolRenderParts?.push({
            type: "tool-createCharacter",
            state: "output-available",
            input: toolInput as Record<string, unknown>,
            output: withDuration as Record<string, unknown>,
          });
          return withDuration;
        },
      }),
      startRoleCycle: tool({
        description: [
          "当你确定世界观与角色准备完成后调用，正式启动角色轮回对话。",
          "调用后系统进入角色串行发言阶段；当一个轮回结束会自动重置为未启动状态。",
        ].join(" "),
        inputSchema: z.object({}),
        execute: async (): Promise<StartRoleCycleToolResult> => {
          const startedAt = Date.now();
          const enabledCharacters = nextRoomConfig.characters.filter(character => character.enabled);
          let result: StartRoleCycleToolResult;

          if (nextRoomConfig.world.playwrightOutput.trim().length === 0) {
            result = {
              status: "rejected",
              message: "请先完成世界观与剧情蓝图输出，再开启轮回。",
            };
          } else if (enabledCharacters.length < 2) {
            result = {
              status: "rejected",
              message: "至少需要 2 个启用角色后才能开启轮回。",
            };
          } else {
            nextTurnState = {
              ...nextTurnState,
              nextPhase: "character",
              cycleArmed: true,
              totalCharacterTurnsInCycle: 0,
              lastSpeakerCharacterId: undefined,
              updatedAt: Date.now(),
            };
            result = {
              status: "started",
              message: `角色轮回已开启（第 ${nextTurnState.cycleNo} 周期）。`,
              cycleNo: nextTurnState.cycleNo,
              nextPhase: nextTurnState.nextPhase,
            };
          }

          const withDuration = {
            ...result,
            __duration: Date.now() - startedAt,
          };
          toolRenderParts?.push({
            type: "tool-startRoleCycle",
            state: "output-available",
            output: withDuration as Record<string, unknown>,
          });
          return withDuration;
        },
      }),
    },
    getNextRoomConfig: () => nextRoomConfig,
    getNextTurnState: () => nextTurnState,
    getToolRenderParts: () => [...(toolRenderParts || [])],
  };
}
