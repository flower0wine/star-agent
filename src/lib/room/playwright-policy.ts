import { z } from "zod";
import type { RoomConfig, RoomPromptRevision } from "./types";

const playwrightRevisionSchema = z.object({
  worldPromptTemplate: z.string().min(1),
  playwrightOutput: z.string().min(1),
  characterPromptPatches: z.array(
    z.object({
      characterId: z.string().min(1),
      prompt: z.string().min(1),
    }),
  ),
  rationale: z.string().min(1),
});

export interface ParsedPlaywrightRevision {
  worldPromptTemplate: string;
  playwrightOutput: string;
  characterPromptPatches: Array<{
    characterId: string;
    prompt: string;
  }>;
  rationale: string;
}

export function buildPlaywrightRevisionPrompt(input: {
  roomConfig: RoomConfig;
  conversationText: string;
}): string {
  const characterList = input.roomConfig.characters
    .filter(character => character.enabled)
    .sort((a, b) => a.order - b.order)
    .map(character => `- ${character.id}: ${character.name}`)
    .join("\n");

  return [
    "你是故事总编剧，需要根据对话进展重写世界观与角色人格。",
    "必须遵守用户给出的创作指令。",
    "输出必须是 JSON，禁止输出 JSON 之外的任何文字。",
    "JSON 字段要求：worldPromptTemplate, playwrightOutput, characterPromptPatches, rationale。",
    "characterPromptPatches 必须覆盖所有启用角色。",
    "每个 prompt 需要体现独特性格、冲突动机和语言风格，避免套路化。",
    "",
    "用户创作指令：",
    input.roomConfig.userDirective,
    "",
    "启用角色列表：",
    characterList,
    "",
    "当前对话：",
    input.conversationText,
  ].join("\n");
}

export function parsePlaywrightRevisionJSON(jsonText: string): ParsedPlaywrightRevision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("编剧输出不是合法 JSON");
  }

  const result = playwrightRevisionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`编剧输出结构不合法: ${result.error.message}`);
  }

  return result.data;
}

export function applyPromptRevision(input: {
  roomConfig: RoomConfig;
  revision: ParsedPlaywrightRevision;
  cycleNo: number;
  revisionId: string;
  createdAt: string;
}): { nextConfig: RoomConfig; revisionRecord: RoomPromptRevision } {
  const enabledCharacters = input.roomConfig.characters.filter(character => character.enabled);
  const patchMap = new Map(
    input.revision.characterPromptPatches.map(patch => [patch.characterId, patch.prompt]),
  );

  const missingCharacters = enabledCharacters
    .filter(character => !patchMap.has(character.id))
    .map(character => character.id);

  if (missingCharacters.length > 0) {
    throw new Error(`编剧输出缺少角色提示词: ${missingCharacters.join(", ")}`);
  }

  const nextCharacters = input.roomConfig.characters.map((character) => {
    const nextPrompt = patchMap.get(character.id);
    if (!nextPrompt) {
      return character;
    }
    return {
      ...character,
      systemPromptTemplate: nextPrompt,
    };
  });

  const nextConfig: RoomConfig = {
    ...input.roomConfig,
    world: {
      worldPromptTemplate: input.revision.worldPromptTemplate,
      playwrightOutput: input.revision.playwrightOutput,
    },
    characters: nextCharacters,
    updatedAt: Date.now(),
  };

  return {
    nextConfig,
    revisionRecord: {
      id: input.revisionId,
      roomId: input.roomConfig.roomId,
      cycleNo: input.cycleNo,
      worldPromptTemplate: input.revision.worldPromptTemplate,
      playwrightOutput: input.revision.playwrightOutput,
      characterPromptPatches: input.revision.characterPromptPatches,
      rationale: input.revision.rationale,
      createdAt: input.createdAt,
    },
  };
}
