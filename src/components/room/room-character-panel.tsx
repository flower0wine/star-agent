import { BotIcon } from "lucide-react";
import type { RoomConfig } from "@/lib/room/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RoomCharacterPanelProps {
  roomConfig: RoomConfig;
}

export function RoomCharacterPanel({ roomConfig }: RoomCharacterPanelProps) {
  const sortedCharacters = roomConfig.characters.toSorted((a, b) => a.order - b.order);

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-secondary/20 via-muted/50 to-transparent pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BotIcon className="size-4" />
          角色设定（编剧维护）
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {sortedCharacters.map(character => (
          <div key={character.id} className="space-y-2 rounded-xl border border-border/70 bg-muted/15 p-3">
            <Label htmlFor={`character-prompt-${character.id}`} className="text-sm font-medium">
              {character.name}
            </Label>
            <Textarea
              id={`character-prompt-${character.id}`}
              rows={5}
              value={character.systemPromptTemplate}
              readOnly
              className="bg-background/70"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
