import dayjs from "dayjs";
import { BotIcon, SparklesIcon, UserIcon } from "lucide-react";
import type { SharedMessage } from "@/lib/room/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface RoomChatMessageListProps {
  messages: SharedMessage[];
}

function getBubbleClass(actorType: SharedMessage["actorType"]) {
  if (actorType === "user") {
    return "border-primary/35 bg-primary/10";
  }
  if (actorType === "playwright") {
    return "border-secondary/55 bg-secondary/20";
  }
  return "border-border/70 bg-card";
}

function getActorIcon(actorType: SharedMessage["actorType"]) {
  if (actorType === "user") {
    return <UserIcon className="size-3.5" />;
  }
  if (actorType === "playwright") {
    return <SparklesIcon className="size-3.5" />;
  }
  return <BotIcon className="size-3.5" />;
}

export function RoomChatMessageList({ messages }: RoomChatMessageListProps) {
  return (
    <Card className="h-full overflow-hidden border-border/70">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/15 via-transparent to-secondary/20 pt-4 pb-3">
        <CardTitle className="text-base">故事舞台</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 pt-3">
        <ScrollArea className="h-full w-full pr-3">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                还没有消息，先输入你的要求或异议，再推进一轮由编剧回应。
              </div>
            )}
            {messages.map(message => (
              <div key={message.id} className={cn("rounded-xl border px-3 py-3", getBubbleClass(message.actorType))}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="inline-flex size-6 items-center justify-center rounded-md border border-border/60 bg-background/70">
                      {getActorIcon(message.actorType)}
                    </span>
                    {message.actorName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    T{message.turnNo} · {dayjs(message.createdAt).format("MM-DD HH:mm:ss")}
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-sm text-foreground leading-relaxed">
                  {message.visibleParts.map((part, idx) => (
                    <p key={`${message.id}-${idx}`} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
