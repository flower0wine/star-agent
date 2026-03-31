"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { UIMessage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { cn } from "@/lib/utils";
import { SubAgentList } from "./sub-agent-list";
import { SubAgentThreadView } from "./sub-agent-thread-view";

export interface SubAgentPanelProps {
  agents: Map<string, SubAgentCard>;
  messages: Map<string, UIMessage[]>;
  activeTaskId?: string;
  onActiveTaskChange?: (taskId?: string) => void;
  onAgentClose?: (taskId: string) => void;
  className?: string;
}

export const SubAgentPanel = memo(({
  agents,
  messages,
  activeTaskId,
  onActiveTaskChange,
  onAgentClose,
  className,
}: SubAgentPanelProps) => {
  const [internalActiveTaskId, setInternalActiveTaskId] = useState<string | undefined>(undefined);
  const agentsList = useMemo(() => [...agents.values()], [agents]);

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
    <div className={cn("flex h-full w-full min-w-0", className)}>
      <SubAgentList
        agents={agentsList}
        activeTaskId={resolvedActiveTaskId}
        onSelect={handleSelect}
      />
      <div className="min-w-0 flex-1">
        <SubAgentThreadView
          agent={activeAgent}
          messages={activeMessages}
          onClose={handleClose}
        />
      </div>
    </div>
  );
});

