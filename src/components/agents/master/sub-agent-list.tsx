"use client";

import { memo } from "react";
import type { SubAgentCard } from "@/types/agent";
import { BotIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SubAgentStatusIcon, SubAgentStatusBadge } from "./sub-agent-status";

interface SubAgentListProps {
  agents: SubAgentCard[];
  activeTaskId?: string;
  onSelect: (taskId: string) => void;
}

export const SubAgentList = memo(({
  agents,
  activeTaskId,
  onSelect,
}: SubAgentListProps) => {
  return (
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
          {agents.map(agent => (
            <Button
              key={agent.taskId}
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
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <SubAgentStatusIcon status={agent.status} className="size-3.5" />
                  <span className="truncate font-mono text-xs">{agent.taskId}</span>
                </div>
                <SubAgentStatusBadge status={agent.status} />
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

