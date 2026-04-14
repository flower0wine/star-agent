import type { RoomConfig, RoomGenerationRequest, RoomTurnState } from "../../types";
import { PLAYWRIGHT_REVIEW_INTERVAL } from "../../constants";
import { sharedMessageText } from "../../message-share-filter";

export function formatClientBrief(config: RoomConfig): string {
  return config.userDirective.trim() || "（用户尚未补充长期创作指令）";
}

function getLastTurnNoByActorType(
  messages: RoomGenerationRequest["sharedMessages"],
  actorType: "user" | "playwright",
): number {
  const turnNos = messages
    .filter(message => message.actorType === actorType)
    .map(message => message.turnNo);

  if (turnNos.length === 0) {
    return 0;
  }

  return Math.max(...turnNos);
}

function getLastPlaywrightReplyTurnNo(messages: RoomGenerationRequest["sharedMessages"]): number {
  const turnNos = messages
    .filter((message) =>
      message.actorType === "playwright"
      && message.metadata?.messageKind !== "playwright-direction",
    )
    .map(message => message.turnNo);

  if (turnNos.length === 0) {
    return 0;
  }

  return Math.max(...turnNos);
}

export function hasPendingClientFeedback(messages: RoomGenerationRequest["sharedMessages"]): boolean {
  const lastUserTurn = getLastTurnNoByActorType(messages, "user");
  const lastPlaywrightReplyTurn = getLastPlaywrightReplyTurnNo(messages);
  return lastUserTurn > lastPlaywrightReplyTurn;
}

export function collectPendingClientFeedback(messages: RoomGenerationRequest["sharedMessages"]): string {
  const lastPlaywrightTurn = getLastPlaywrightReplyTurnNo(messages);
  const feedbackMessages = messages
    .filter(message => message.actorType === "user" && message.turnNo > lastPlaywrightTurn)
    .toSorted((a, b) => a.turnNo - b.turnNo)
    .map(message => `- ${sharedMessageText(message)}`);

  if (feedbackMessages.length === 0) {
    return "（无新增用户反馈）";
  }

  return feedbackMessages.join("\n");
}

export function buildCharacterSystemPrompt(input: {
  roomConfig: RoomConfig;
  characterId: string;
  playwrightDirection: string;
}): string {
  const character = input.roomConfig.characters.find(item => item.id === input.characterId);
  if (!character) {
    throw new Error(`角色不存在: ${input.characterId}`);
  }

  return [
    `你将扮演角色: ${character.name}。`,
    "你必须始终使用简体中文输出。",
    "以下是用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    input.roomConfig.world.worldPromptTemplate,
    character.systemPromptTemplate,
    `编剧本轮导演指令：\n${input.playwrightDirection}`,
    "你只能以该角色身份输出一段推进剧情的对话，不要解释系统规则。",
  ].join("\n\n");
}

export function buildCharacterPrompt(conversationText: string): string {
  return [
    "以下是交流室对话历史：",
    conversationText || "（暂无历史）",
    "",
    "请继续剧情，输出一段角色对话。",
  ].join("\n");
}

export function buildPlaywrightReplyPrompt(input: {
  roomConfig: RoomConfig;
  conversationText: string;
  clientFeedback: string;
}): string {
  return [
    "你是编剧，正在直接回复用户。",
    "你的全部输出必须为简体中文。",
    "要求：",
    "1) 复述你理解到的需求变化。",
    "2) 说明你将如何调整世界观、剧情推进与角色弧线。",
    "3) 语气专业且可执行，禁止空泛表达。",
    "",
    "用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    "用户最新反馈：",
    input.clientFeedback,
    "",
    "当前对话：",
    input.conversationText || "（暂无历史）",
  ].join("\n");
}

export function buildPlaywrightControlPrompt(input: {
  roomConfig: RoomConfig;
  conversationText: string;
  clientFeedback?: string;
}): string {
  return [
    "你是故事总编剧，当前处于“轮回启动前”控制阶段。",
    "你的全部输出必须为简体中文。",
    "你可以调用 createCharacter 持续完善角色，也可以在准备就绪后调用 startRoleCycle 开启角色轮回。",
    "若尚未满足条件，请明确指出缺失项，不要强行开启。",
    "",
    "用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    "用户最新反馈：",
    input.clientFeedback || "（无新增反馈）",
    "",
    "当前对话：",
    input.conversationText || "（暂无历史）",
  ].join("\n");
}

export function hasBootstrapCompleted(roomConfig: RoomConfig): boolean {
  const hasWorld = roomConfig.world.playwrightOutput.trim().length > 0;
  const hasEnabledCharacters = roomConfig.characters.some(character => character.enabled);
  return hasWorld && hasEnabledCharacters;
}

export function buildPlaywrightBootstrapPrompt(roomConfig: RoomConfig, conversationText: string): string {
  return [
    "你是故事总编剧，需要在正式对话开始前完成初始化。",
    "你的全部输出必须为简体中文。",
    "强制要求：",
    "1) 先定义完整世界观与故事主线（冲突源、阵营关系、价值议题、叙事风格）。",
    "2) 必须调用 createCharacter 工具创建 3-6 个角色，且角色名称必须是中文名。",
    "3) 每个角色必须遵守统一模板字段，不允许漏填。",
    "4) 若你确认准备完成，请调用 startRoleCycle 工具开启轮回；否则保持未开启状态并说明差距。",
    "5) 最后输出给用户的《开场设定稿》，内容需包含世界观摘要、角色阵列、首幕张力。",
    "",
    "用户创作指令：",
    formatClientBrief(roomConfig),
    "",
    "已有对话（若为空表示全新开始）：",
    conversationText || "（暂无历史）",
  ].join("\n");
}

export function buildPlaywrightFeedbackRevisionPrompt(input: {
  roomConfig: RoomConfig;
  conversationText: string;
  clientFeedback: string;
}): string {
  const characterList = input.roomConfig.characters
    .filter(character => character.enabled)
    .toSorted((a, b) => a.order - b.order)
    .map(character => `- ${character.id}: ${character.name}`)
    .join("\n");

  return [
    "你是故事总编剧，请基于用户最新反馈重写提示词配置。",
    "你的全部输出必须为简体中文。",
    "输出必须是 JSON，禁止额外文字。",
    "字段要求：worldPromptTemplate, playwrightOutput, characterPromptPatches, rationale。",
    "characterPromptPatches 必须覆盖所有启用角色。",
    "",
    "用户创作指令：",
    formatClientBrief(input.roomConfig),
    "",
    "用户最新反馈：",
    input.clientFeedback,
    "",
    "启用角色列表：",
    characterList,
    "",
    "当前对话：",
    input.conversationText || "（暂无历史）",
  ].join("\n");
}

export function nextCharacterTurnState(current: RoomTurnState, speakerId: string): RoomTurnState {
  const total = current.totalCharacterTurnsInCycle + 1;
  const nextPhase = total >= PLAYWRIGHT_REVIEW_INTERVAL ? "playwright" : "character";

  return {
    ...current,
    totalCharacterTurnsInCycle: total,
    lastSpeakerCharacterId: speakerId,
    cycleArmed: true,
    nextPhase,
    updatedAt: Date.now(),
  };
}

export function nextPlaywrightTurnState(current: RoomTurnState): RoomTurnState {
  return {
    ...current,
    cycleNo: current.cycleNo + 1,
    totalCharacterTurnsInCycle: 0,
    lastSpeakerCharacterId: undefined,
    cycleArmed: false,
    nextPhase: "playwright",
    updatedAt: Date.now(),
  };
}

export function extractJSONObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}
