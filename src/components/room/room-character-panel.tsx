import { BotIcon, ChevronDownIcon } from "lucide-react";
import type { RoomConfig } from "@/lib/room/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
          <Collapsible
            key={character.id}
            defaultOpen={false}
            className="rounded-xl border border-border/70 bg-muted/15"
          >
            <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
              <Label htmlFor={`character-prompt-${character.id}`} className="text-sm font-medium">
                {character.name}
              </Label>
              <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              <Textarea
                id={`character-prompt-${character.id}`}
                rows={5}
                value={character.systemPromptTemplate}
                readOnly
                className="bg-background/70"
              />
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}
