import type { UIMessage } from "ai";

export type RoomActorType = "user" | "character" | "playwright" | "system";

export interface SharedMessagePart {
  type: "text" | "tool-summary";
  text: string;
}

export interface SharedMessageRenderPart {
  type: "text" | "reasoning" | "tool-summary" | "tool-createCharacter" | "tool-setWorldBlueprint" | "tool-startRoleCycle";
  text?: string;
  state?: "input-streaming" | "output-available" | "output-error";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
}

export interface SharedMessage {
  id: string;
  roomId: string;
  turnNo: number;
  actorType: RoomActorType;
  actorId: string;
  actorName: string;
  visibleParts: SharedMessagePart[];
  renderParts?: SharedMessageRenderPart[];
  createdAt: string;
  metadata?: {
    sourceMessageId?: string;
    generationCycle?: number;
    messageKind?: "user-input" | "playwright-bootstrap" | "playwright-control" | "playwright-reply" | "playwright-direction" | "playwright-cycle-review" | "character-dialogue";
  };
}

export interface RoomCharacterProfile {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  systemPromptTemplate: string;
}

export interface RoomPlaywrightProfile {
  id: string;
  name: string;
  systemPromptTemplate: string;
}

export interface RoomWorldConfig {
  worldPromptTemplate: string;
  playwrightOutput: string;
  storyOutline: string;
}

export interface RoomConfig {
  roomId: string;
  name: string;
  userDirective: string;
  playwright: RoomPlaywrightProfile;
  world: RoomWorldConfig;
  characters: RoomCharacterProfile[];
  updatedAt: number;
}

export interface RoomTurnState {
  roomId: string;
  cycleNo: number;
  totalCharacterTurnsInCycle: number;
  lastSpeakerCharacterId?: string;
  cycleArmed: boolean;
  nextPhase: "character" | "playwright";
  updatedAt: number;
}

export interface RoomPromptRevision {
  id: string;
  roomId: string;
  cycleNo: number;
  worldPromptTemplate: string;
  playwrightOutput: string;
  characterPromptPatches: Array<{
    characterId: string;
    prompt: string;
  }>;
  rationale: string;
  createdAt: string;
}

export interface RoomGenerationRequest {
  requestId?: string;
  roomId: string;
  sharedMessages: SharedMessage[];
  roomConfig: RoomConfig;
  turnState: RoomTurnState;
  modelConfig?: {
    providerId: string;
    modelId: string;
    apiKey?: string;
  };
}

export interface RoomGenerationResponse {
  phase: "character" | "playwright";
  message: SharedMessage;
  extraMessages?: SharedMessage[];
  turnState: RoomTurnState;
  roomConfig?: RoomConfig;
  promptRevision?: RoomPromptRevision;
}

export interface MessageShareFilterInput {
  roomId: string;
  turnNo: number;
  actorType: RoomActorType;
  actorId: string;
  actorName: string;
  message: UIMessage;
  createdAt: string;
}
