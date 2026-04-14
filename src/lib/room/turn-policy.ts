import type { RoomCharacterProfile, RoomTurnState } from "./types";

function sortCharacters(characters: RoomCharacterProfile[]): RoomCharacterProfile[] {
  return [...characters]
    .filter(character => character.enabled)
    .sort((a, b) => a.order - b.order);
}

export function resolveNextSpeaker(
  characters: RoomCharacterProfile[],
  turnState: Pick<RoomTurnState, "lastSpeakerCharacterId">,
): RoomCharacterProfile {
  const enabledCharacters = sortCharacters(characters);
  if (enabledCharacters.length === 0) {
    throw new Error("至少需要一个启用中的角色");
  }

  if (!turnState.lastSpeakerCharacterId) {
    return enabledCharacters[0];
  }

  const currentIdx = enabledCharacters.findIndex(
    character => character.id === turnState.lastSpeakerCharacterId,
  );

  if (currentIdx < 0 || currentIdx === enabledCharacters.length - 1) {
    return enabledCharacters[0];
  }

  return enabledCharacters[currentIdx + 1];
}
