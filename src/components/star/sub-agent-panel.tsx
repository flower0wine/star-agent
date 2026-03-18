/**
 * Sub-Agent Panel
 *
 * Collapsible panel for displaying sub-agent status cards.
 * Shows running sub-agents in real-time.
 */

"use client";

import { useState } from "react";
import type { SubAgentCard } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  CircleIcon,
  Loader2Icon,
  XCircleIcon,
  TerminalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SubAgentPanel props
 */
export interface SubAgentPanelProps {
  /** Sub-agent cards to display */
  agents: Map<string, SubAgentCard>;
  /** Callback when a card is expanded */
  onExpand?: (taskId: string) => void;
  /** Callback when a card is collapsed */
  onCollapse?: (taskId: string) => void;
  /** Custom className */
  className?: string;
}

/**
 * Status icon component
 */
function StatusIcon({
  status,
  className,
}: {
  status: SubAgentCard["status"];
  className?: string;
}) {
  switch (status) {
    case "pending":
      return <CircleIcon className={cn("size-4 text-muted-foreground", className)} />;
    case "running":
      return (
        <Loader2Icon
          className={cn("size-4 text-blue-500 animate-spin", className)}
        />
      );
    case "completed":
      return (
        <CheckCircleIcon className={cn("size-4 text-green-500", className)} />
      );
    case "failed":
      return <XCircleIcon className={cn("size-4 text-destructive", className)} />;
    default:
      return null;
  }
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: SubAgentCard["status"] }) {
  const variants: Record<SubAgentCard["status"], "secondary" | "default" | "destructive" | "outline"> = {
    pending: "secondary",
    running: "default",
    completed: "secondary",
    failed: "destructive",
  };

  const labels: Record<SubAgentCard["status"], string> = {
    pending: "等待中",
    running: "运行中",
    completed: "已完成",
    failed: "失败",
  };

  return (
    <Badge variant={variants[status]} className="text-xs">
      {labels[status]}
    </Badge>
  );
}

/**
 * Agent card component
 */
function AgentCard({
  agent,
  isExpanded,
  onToggle,
}: {
  agent: SubAgentCard;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "border rounded-lg transition-colors hover:bg-muted/30 cursor-pointer",
        "bg-card"
      )}
      onClick={onToggle}
    >
      {/* Card header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={agent.status} />
          <span className="text-sm font-medium truncate">
            {agent.taskId.slice(0, 16)}...
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">
            {agent.reposCount} repos
          </Badge>
          <StatusBadge status={agent.status} />
        </div>
      </div>

      {/* Task description */}
      {agent.task && (
        <div className="px-3 pb-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {agent.task}
          </p>
        </div>
      )}

      {/* Progress bar (only when running) */}
      {agent.status === "running" && (
        <div className="px-3 pb-2">
          <Progress value={agent.progress} className="h-1" />
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {/* Current output */}
            {agent.currentOutput && (
              <div className="rounded-md bg-muted p-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <TerminalIcon className="size-3" />
                  <span>输出</span>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-auto">
                  {agent.currentOutput}
                </pre>
              </div>
            )}

            {/* Final result */}
            {agent.finalResult && agent.status === "completed" && (
              <div className="text-xs text-green-600 dark:text-green-400">
                {agent.finalResult}
              </div>
            )}

            {/* Error message */}
            {agent.error && agent.status === "failed" && (
              <div className="text-xs text-destructive">
                错误: {agent.error}
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </div>
  );
}

/**
 * Sub-Agent Panel component
 *
 * Collapsible panel showing all sub-agent cards.
 * Positioned as a sidebar on the right side of the chat.
 */
export function SubAgentPanel({
  agents,
  onExpand,
  onCollapse,
  className,
}: SubAgentPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const agentsList = [...agents.values()];

  // Don't render if no agents
  if (agentsList.length === 0) {
    return null;
  }

  const handleToggleCard = (taskId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
        onCollapse?.(taskId);
      } else {
        next.add(taskId);
        onExpand?.(taskId);
      }
      return next;
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      {/* Panel header */}
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium bg-muted/50 hover:bg-muted/70 transition-colors rounded-t-lg">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
          <span>子 Agent 进度</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {agentsList.length}
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <ScrollArea className="h-[300px]">
          <div className="p-3 space-y-2">
            {agentsList.map((agent) => (
              <AgentCard
                key={agent.taskId}
                agent={agent}
                isExpanded={expandedCards.has(agent.taskId)}
                onToggle={() => handleToggleCard(agent.taskId)}
              />
            ))}
          </div>
        </ScrollArea>
      </CollapsibleContent>
    </Collapsible>
  );
}

export { SubAgentPanel as SubAgentPanelComponent };
