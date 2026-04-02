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
import { BotIcon, XIcon, ZapIcon } from "lucide-react";
import { SubAgentStatusBadge } from "./sub-agent-status";
import { formatTokens } from "@/lib/chat/usage-utils";

type MessageForRenderer = UIMessage & { metadata?: { totalUsage?: LanguageModelUsage } };

interface SubAgentThreadViewProps {
  agent?: SubAgentCard;
  messages: UIMessage[];
  usage?: LanguageModelUsage;
  onClose?: (taskId: string) => void;
}

export const SubAgentThreadView = memo(({
  agent,
  messages,
  usage,
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
  const totalTokens = usage?.totalTokens || 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <BotIcon className="size-4 text-muted-foreground" />
          <span className="truncate font-mono text-sm">{agent.taskId}</span>
          <SubAgentStatusBadge status={agent.status} />
          {totalTokens > 0 && (
            <span className="flex items-center gap-1 rounded border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <ZapIcon className="size-3" />
              {formatTokens(totalTokens)}
            </span>
          )}
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

      {agent.task && (
        <div className="border-b bg-muted/20 px-4 py-2">
          <p className="text-[11px] text-muted-foreground">任务</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed">
            {agent.task}
          </p>
        </div>
      )}

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

