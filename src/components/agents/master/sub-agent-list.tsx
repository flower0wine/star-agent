"use client";

import { memo } from "react";
import type { LanguageModelUsage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { BotIcon, ZapIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/chat/usage-utils";
import { SubAgentStatusIcon, SubAgentStatusBadge } from "./sub-agent-status";

interface SubAgentListProps {
  agents: SubAgentCard[];
  activeTaskId?: string;
  usageByTask?: Map<string, LanguageModelUsage>;
  onSelect: (taskId: string) => void;
}

function compactTaskId(taskId: string): string {
  if (taskId.length <= 24) {
    return taskId;
  }

  return `${taskId.slice(0, 12)}...${taskId.slice(-8)}`;
}

export const SubAgentList = memo(({
  agents,
  activeTaskId,
  usageByTask,
  onSelect,
}: SubAgentListProps) => {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full w-64 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <BotIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Subagents</span>
          </div>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {agents.length}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {agents.map((agent) => {
              const usage = usageByTask?.get(agent.taskId);
              const totalTokens = usage?.totalTokens || 0;

              return (
                <Tooltip key={agent.taskId}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSelect(agent.taskId)}
                      className={cn(
                        "h-auto w-full justify-start rounded-lg border px-2.5 py-2 text-left",
                        "hover:bg-muted/60",
                        activeTaskId === agent.taskId
                          ? "border-border bg-muted/60"
                          : "border-transparent bg-transparent"
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                          <SubAgentStatusIcon status={agent.status} className="size-3.5" />
                          <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs">
                            {compactTaskId(agent.taskId)}
                          </span>
                        </div>
                        {totalTokens > 0 && (
                          <div className="flex shrink-0 items-center gap-1 rounded border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <ZapIcon className="size-3" />
                            <span>{formatTokens(totalTokens)}</span>
                          </div>
                        )}
                        <div className="shrink-0">
                          <SubAgentStatusBadge status={agent.status} />
                        </div>
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-80 whitespace-pre-wrap break-words">
                    <div className="font-mono text-xs">{agent.taskId}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
});

