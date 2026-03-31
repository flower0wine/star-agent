"use client";

import { memo } from "react";
import type { LanguageModelUsage, UIMessage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  MessageLoadingIndicator,
  MessageRenderer,
} from "@/components/chat/message-renderer";
import { BotIcon, XIcon } from "lucide-react";
import { SubAgentStatusBadge } from "./sub-agent-status";

type MessageForRenderer = UIMessage & { metadata?: { totalUsage?: LanguageModelUsage } };

interface SubAgentThreadViewProps {
  agent?: SubAgentCard;
  messages: UIMessage[];
  onClose?: (taskId: string) => void;
}

export const SubAgentThreadView = memo(({
  agent,
  messages,
  onClose,
}: SubAgentThreadViewProps) => {
  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        请选择一个 Subagent 查看消息
      </div>
    );
  }

  const isStreaming = agent.status === "running";
  const fallbackMessages: UIMessage[] = agent.finalResult
    ? [
        {
          id: `${agent.taskId}-restored`,
          role: "assistant",
          parts: [{ type: "text", text: agent.finalResult }],
        } as UIMessage,
      ]
    : [];
  const displayMessages = messages.length > 0 ? messages : fallbackMessages;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <BotIcon className="size-4 text-muted-foreground" />
          <span className="truncate font-mono text-sm">{agent.taskId}</span>
          <SubAgentStatusBadge status={agent.status} />
        </div>
        {onClose && agent.status !== "running" && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onClose(agent.taskId)}
            aria-label="关闭"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {displayMessages.length === 0 ? (
            <div className="flex h-36 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              {isStreaming ? "Subagent 处理中..." : "暂无消息"}
            </div>
          ) : (
            <>
              {displayMessages.map((message, index) => (
                <MessageRenderer
                  key={message.id}
                  message={message as MessageForRenderer}
                  isStreaming={isStreaming && index === displayMessages.length - 1}
                  isLastMessage={index === displayMessages.length - 1}
                />
              ))}
            </>
          )}

          {isStreaming && displayMessages.length > 0 && <MessageLoadingIndicator />}
        </div>
      </ScrollArea>
    </div>
  );
});

