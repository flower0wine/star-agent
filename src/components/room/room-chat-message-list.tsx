import { useMemo } from "react";
import type { SharedMessage } from "@/lib/room/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageRenderer } from "@/components/chat/message-renderer";
import { ChatMessageWrapper, ChatMessages } from "@/components/chat/content";
import { cn } from "@/lib/utils";
import { formatRoomMessageMeta, toRoomRenderableMessage } from "./room-message-adapter";

interface RoomChatMessageListProps {
  messages: SharedMessage[];
}

function getMessageContentClass(actorType: SharedMessage["actorType"]) {
  if (actorType === "playwright") {
    return "rounded-xl border border-primary/25 bg-primary/5 px-4 py-3";
  }
  if (actorType === "character") {
    return "rounded-xl border border-secondary/35 bg-secondary/10 px-4 py-3";
  }
  if (actorType === "system") {
    return "rounded-xl border border-border/70 bg-muted/20 px-4 py-3";
  }
  return "";
}

export function RoomChatMessageList({ messages }: RoomChatMessageListProps) {
  const renderedMessages = useMemo(() => {
    return messages.map(message => ({
      raw: message,
      ui: toRoomRenderableMessage(message),
    }));
  }, [messages]);

  return (
    <Card className="h-full overflow-hidden border-border/70">
      <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/15 via-transparent to-secondary/20 pt-4 pb-3">
        <CardTitle className="text-base">故事舞台</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 pt-3">
        <ScrollArea className="h-full w-full pr-3">
          <div className="space-y-4">
            {renderedMessages.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                还没有消息，先输入你的要求或异议，再推进一轮由编剧回应。
              </div>
            )}

            <ChatMessages>
              {renderedMessages.map(({ raw, ui }, index) => (
                <ChatMessageWrapper key={raw.id} id={raw.id} isLast={index === renderedMessages.length - 1}>
                  <MessageRenderer
                    message={ui}
                    isStreaming={raw.id.startsWith("room-stream-")}
                    isLastMessage={index === renderedMessages.length - 1}
                    assistantDisplayName={raw.actorType === "user" ? undefined : raw.actorName}
                    messageMetaText={formatRoomMessageMeta(raw)}
                    contentClassName={cn(getMessageContentClass(raw.actorType))}
                  />
                </ChatMessageWrapper>
              ))}
            </ChatMessages>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
