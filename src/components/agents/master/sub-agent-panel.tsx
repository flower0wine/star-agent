/**
 * Sub-Agent Panel
 *
 * Tab-based panel for displaying sub-agent messages.
 * Each sub-agent has its own tab with message history.
 *
 * Performance optimizations:
 * - React.memo to prevent unnecessary re-renders
 * - Removed AnimatePresence/motion for streaming content (causes jank)
 * - useMemo for expensive computations
 */

"use client";

import { useState, useMemo, memo, useCallback } from "react";
import type { UIMessage, LanguageModelUsage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircleIcon,
  CircleIcon,
  Loader2Icon,
  XCircleIcon,
  BotIcon,
  XIcon,
  Clock3Icon,
  HashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageRenderer, MessageLoadingIndicator } from "@/components/chat/message-renderer";

/**
 * SubAgentPanel props
 */
export interface SubAgentPanelProps {
  /** Sub-agent cards to display */
  agents: Map<string, SubAgentCard>;
  /** Sub-agent messages to display */
  messages: Map<string, UIMessage[]>;
  /** Controlled active task id */
  activeTaskId?: string;
  /** Active tab change callback */
  onActiveTaskChange?: (taskId?: string) => void;
  /** Custom className */
  className?: string;
}

/**
 * Status icon component - memoized with improved visibility
 */
const StatusIcon = memo(({
  status,
  size = "sm",
  showLabel = false,
}: {
  status: SubAgentCard["status"];
  size?: "sm" | "md";
  showLabel?: boolean;
}) => {
  const iconSize = size === "sm" ? "size-3.5" : "size-4";

  const config = {
    pending: {
      icon: <CircleIcon className={cn(iconSize, "text-muted-foreground/60")} />,
      label: "等待中",
      bg: "bg-muted/50",
    },
    running: {
      icon: <Loader2Icon className={cn(iconSize, "text-blue-500 animate-spin")} />,
      label: "运行中",
      bg: "bg-blue-500/10",
    },
    completed: {
      icon: <CheckCircleIcon className={cn(iconSize, "text-green-500")} />,
      label: "已完成",
      bg: "bg-green-500/10",
    },
    failed: {
      icon: <XCircleIcon className={cn(iconSize, "text-destructive")} />,
      label: "失败",
      bg: "bg-destructive/10",
    },
  };

  const { icon, label, bg } = config[status] || config.pending;

  if (showLabel) {
    return (
      <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full", bg)}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
    );
  }

  return icon;
});

// Type assertion for message compatibility with MessageRenderer
type MessageForRenderer = UIMessage & { metadata?: { totalUsage?: LanguageModelUsage } };

/**
 * Sub-Agent Tab component - memoized with improved UX
 */
const SubAgentTab = memo(({
  agent,
  messages,
  onClose,
}: {
  agent: SubAgentCard;
  messages: UIMessage[];
  onClose?: (taskId: string) => void;
}) => {
  const isStreaming = agent.status === "running";
  const hasMessages = messages.length > 0;
  const progressValue = Math.max(0, Math.min(100, agent.progress ?? 0));

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-muted/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon status={agent.status} showLabel />
              <Badge variant="outline" className="h-6 gap-1 px-2 text-[11px]">
                <HashIcon className="size-3" />
                {agent.reposCount}
              </Badge>
            </div>
            {agent.task && (
              <p className="line-clamp-2 text-sm">
                {agent.task}
              </p>
            )}
          </div>
          {onClose && agent.status !== "running" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onClose(agent.taskId)}
              className="mt-0.5"
              aria-label="关闭"
            >
              <XIcon className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3Icon className="size-3" />
              任务进度
            </span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-1.5" />
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {!hasMessages ? (
            <div className="flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 text-muted-foreground">
              {isStreaming ? (
                <>
                  <Loader2Icon className="size-5 animate-spin text-blue-500" />
                  <span className="text-sm">正在处理...</span>
                  {agent.task && (
                    <p className="text-xs text-muted-foreground/60 max-w-[180px] text-center truncate">
                      {agent.task}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="size-8 rounded-full bg-muted/50 flex items-center justify-center">
                    <BotIcon className="size-4 text-muted-foreground/50" />
                  </div>
                  <span className="text-sm">等待任务开始...</span>
                </>
              )}
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageRenderer
                  key={message.id}
                  message={message as MessageForRenderer}
                  isStreaming={isStreaming && index === messages.length - 1}
                  isLastMessage={index === messages.length - 1}
                />
              ))}
            </>
          )}

          {/* Show loading indicator when streaming and has messages */}
          {isStreaming && hasMessages && (
            <MessageLoadingIndicator />
          )}
        </div>
      </ScrollArea>
    </div>
  );
});

/**
 * Sub-Agent Panel component
 *
 * Tab-based panel showing sub-agent messages.
 * Each sub-agent gets its own tab with MessageRenderer.
 */
export function SubAgentPanel({
  agents,
  messages,
  activeTaskId,
  onActiveTaskChange,
  className,
  onAgentClose,
}: SubAgentPanelProps & {
  onAgentClose?: (taskId: string) => void;
}) {
  const [internalActiveTab, setInternalActiveTab] = useState<string | null>(null);

  const agentsList = useMemo(() => [...agents.values()], [agents]);
  const stats = useMemo(() => {
    return agentsList.reduce(
      (acc, agent) => {
        acc.total += 1;
        acc[agent.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, running: 0, completed: 0, failed: 0 } as Record<SubAgentCard["status"] | "total", number>
    );
  }, [agentsList]);

  if (agentsList.length === 0) {
    return null;
  }

  const firstAgentId = agentsList[0]?.taskId;
  const preferredActive = activeTaskId && agents.has(activeTaskId) ? activeTaskId : null;
  const fallbackActive = internalActiveTab && agents.has(internalActiveTab) ? internalActiveTab : null;
  const currentActiveTab = preferredActive || fallbackActive || firstAgentId;

  const handleTabClose = useCallback((taskId: string) => {
    onAgentClose?.(taskId);
    if (currentActiveTab === taskId) {
      const remainingTabs = agentsList.filter(a => a.taskId !== taskId);
      const nextTaskId = remainingTabs[0]?.taskId || null;
      setInternalActiveTab(nextTaskId);
      onActiveTaskChange?.(nextTaskId || undefined);
    }
  }, [onAgentClose, currentActiveTab, agentsList, onActiveTaskChange]);

  const handleTabChange = useCallback((taskId: string) => {
    setInternalActiveTab(taskId);
    onActiveTaskChange?.(taskId);
  }, [onActiveTaskChange]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col h-full w-full", className)}>
        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <BotIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">子 Agent</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
              {stats.total}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {stats.running > 0 && (
              <Badge variant="outline" className="h-5 border-blue-300/70 px-1.5 text-blue-600">
                运行中 {stats.running}
              </Badge>
            )}
            {stats.completed > 0 && (
              <Badge variant="outline" className="h-5 border-green-300/70 px-1.5 text-green-600">
                完成 {stats.completed}
              </Badge>
            )}
            {stats.failed > 0 && (
              <Badge variant="outline" className="h-5 border-destructive/50 px-1.5 text-destructive">
                失败 {stats.failed}
              </Badge>
            )}
          </div>
        </div>

        <Tabs
          value={currentActiveTab || undefined}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="border-b bg-background px-2 py-2">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 scrollbar-hide">
              {agentsList.map((agent) => (
                <Tooltip key={agent.taskId}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={agent.taskId}
                      className={cn(
                        "h-auto min-w-[120px] max-w-[220px] items-start rounded-lg border border-transparent px-2.5 py-2 text-left text-xs whitespace-nowrap",
                        "data-[state=active]:border-border data-[state=active]:bg-muted/35 data-[state=active]:shadow-none"
                      )}
                    >
                      <div className="flex w-full items-center gap-1.5">
                        <StatusIcon status={agent.status} size="sm" />
                        <span className="truncate text-[11px] text-muted-foreground">
                          {agent.taskId.slice(0, 12)}
                        </span>
                      </div>
                      <div className="mt-1 w-full truncate font-medium">
                        {agent.task || "未命名任务"}
                      </div>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">{agent.task || agent.taskId}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </div>

          {agentsList.map((agent) => (
            <TabsContent
              key={agent.taskId}
              value={agent.taskId}
              className="flex-1 min-h-0 m-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              {currentActiveTab === agent.taskId && (
                <SubAgentTab
                  agent={agent}
                  messages={messages.get(agent.taskId) || []}
                  onClose={handleTabClose}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export { SubAgentPanel as SubAgentPanelComponent };
