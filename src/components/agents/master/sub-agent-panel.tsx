"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { LanguageModelUsage, UIMessage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { cn } from "@/lib/utils";
import { addUsage, formatTokens, sumUsage } from "@/lib/chat/usage-utils";
import { SubAgentList } from "./sub-agent-list";
import { SubAgentThreadView } from "./sub-agent-thread-view";

export interface SubAgentPanelProps {
  agents: Map<string, SubAgentCard>;
  messages: Map<string, UIMessage[]>;
  masterMessages: UIMessage[];
  activeTaskId?: string;
  onActiveTaskChange?: (taskId?: string) => void;
  onAgentClose?: (taskId: string) => void;
  className?: string;
}

function getMessageUsage(message: UIMessage): LanguageModelUsage | undefined {
  if (message.role !== "assistant") {
    return undefined;
  }

  const metadata = (message as UIMessage & { metadata?: { totalUsage?: LanguageModelUsage } }).metadata;
  return metadata?.totalUsage;
}

export const SubAgentPanel = memo(({
  agents,
  messages,
  masterMessages,
  activeTaskId,
  onActiveTaskChange,
  onAgentClose,
  className,
}: SubAgentPanelProps) => {
  const [internalActiveTaskId, setInternalActiveTaskId] = useState<string | undefined>(undefined);
  const agentsList = useMemo(() => [...agents.values()], [agents]);

  const usageByTask = useMemo(() => {
    const usageMap = new Map<string, LanguageModelUsage>();

    agents.forEach((card, taskId) => {
      if (card.usage) {
        usageMap.set(taskId, card.usage);
      }
    });

    messages.forEach((taskMessages, taskId) => {
      const usage = sumUsage(taskMessages.map(getMessageUsage));
      if ((usage.totalTokens || 0) > 0) {
        usageMap.set(taskId, usage);
      }
    });

    return usageMap;
  }, [agents, messages]);

  const subAgentUsage = useMemo(() => {
    return sumUsage([...usageByTask.values()]);
  }, [usageByTask]);

  const masterUsage = useMemo(() => {
    return sumUsage(masterMessages.map(getMessageUsage));
  }, [masterMessages]);

  const combinedUsage = useMemo(() => {
    return addUsage(masterUsage, subAgentUsage);
  }, [masterUsage, subAgentUsage]);

  const resolvedActiveTaskId = useMemo(() => {
    if (activeTaskId && agents.has(activeTaskId)) {
      return activeTaskId;
    }
    if (internalActiveTaskId && agents.has(internalActiveTaskId)) {
      return internalActiveTaskId;
    }
    return agentsList[0]?.taskId;
  }, [activeTaskId, agents, internalActiveTaskId, agentsList]);

  const activeAgent = resolvedActiveTaskId ? agents.get(resolvedActiveTaskId) : undefined;
  const activeMessages = resolvedActiveTaskId ? (messages.get(resolvedActiveTaskId) || []) : [];
  const activeUsage = resolvedActiveTaskId ? usageByTask.get(resolvedActiveTaskId) : undefined;

  const handleSelect = useCallback((taskId: string) => {
    setInternalActiveTaskId(taskId);
    onActiveTaskChange?.(taskId);
  }, [onActiveTaskChange]);

  const handleClose = useCallback((taskId: string) => {
    onAgentClose?.(taskId);

    if (resolvedActiveTaskId !== taskId) {
      return;
    }

    const nextTaskId = agentsList.find(agent => agent.taskId !== taskId)?.taskId;
    setInternalActiveTaskId(nextTaskId);
    onActiveTaskChange?.(nextTaskId);
  }, [onAgentClose, resolvedActiveTaskId, agentsList, onActiveTaskChange]);

  if (agentsList.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col", className)}>
      <div className="grid grid-cols-1 gap-2 border-b bg-muted/20 px-3 py-2 text-xs sm:grid-cols-3">
        <div className="rounded border border-border/70 bg-background/80 px-2 py-1.5">
          <div className="text-muted-foreground">Master Tokens</div>
          <div className="font-medium text-foreground">
            {formatTokens(masterUsage.totalTokens)}
            <span className="ml-1 text-muted-foreground">
              (in {formatTokens(masterUsage.inputTokens)} / out {formatTokens(masterUsage.outputTokens)})
            </span>
          </div>
        </div>
        <div className="rounded border border-border/70 bg-background/80 px-2 py-1.5">
          <div className="text-muted-foreground">Subagent Tokens</div>
          <div className="font-medium text-foreground">
            {formatTokens(subAgentUsage.totalTokens)}
            <span className="ml-1 text-muted-foreground">
              (in {formatTokens(subAgentUsage.inputTokens)} / out {formatTokens(subAgentUsage.outputTokens)})
            </span>
          </div>
        </div>
        <div className="rounded border border-border/70 bg-background/80 px-2 py-1.5">
          <div className="text-muted-foreground">Combined Tokens</div>
          <div className="font-medium text-foreground">
            {formatTokens(combinedUsage.totalTokens)}
            <span className="ml-1 text-muted-foreground">
              (in {formatTokens(combinedUsage.inputTokens)} / out {formatTokens(combinedUsage.outputTokens)})
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <SubAgentList
          agents={agentsList}
          activeTaskId={resolvedActiveTaskId}
          onSelect={handleSelect}
        />
        <div className="min-w-0 flex-1">
          <SubAgentThreadView
            agent={activeAgent}
            messages={activeMessages}
            usage={activeUsage}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
});
