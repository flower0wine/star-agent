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
  HashIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageRenderer, MessageLoadingIndicator } from "./message-renderer";

/**
 * SubAgentPanel props
 */
export interface SubAgentPanelProps {
  /** Sub-agent cards to display */
  agents: Map<string, SubAgentCard>;
  /** Sub-agent messages to display */
  messages: Map<string, UIMessage[]>;
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

  return (
    <div className="flex flex-col h-full">
      {/* Tab header info - compact and informative */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusIcon status={agent.status} showLabel />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {agent.reposCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <HashIcon className="size-3" />
              <span>{agent.reposCount}</span>
            </div>
          )}
          {onClose && agent.status !== "running" && (
            <button
              onClick={() => onClose(agent.taskId)}
              className="size-5 rounded-md hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
              aria-label="关闭"
            >
              <XIcon className="size-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Task description - if available */}
      {agent.task && (
        <div className="px-3 py-1.5 bg-muted/10 border-b border-border/50">
          <p className="text-xs text-muted-foreground/80 truncate">
            {agent.task}
          </p>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
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
  className,
  onAgentClose,
}: SubAgentPanelProps & {
  onAgentClose?: (taskId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const agentsList = useMemo(() => [...agents.values()], [agents]);

  if (agentsList.length === 0) {
    return null;
  }

  const firstAgentId = agentsList[0]?.taskId;
  const currentActiveTab = activeTab && agents.has(activeTab) ? activeTab : firstAgentId;

  const handleTabClose = useCallback((taskId: string) => {
    onAgentClose?.(taskId);
    if (currentActiveTab === taskId) {
      const remainingTabs = agentsList.filter(a => a.taskId !== taskId);
      setActiveTab(remainingTabs[0]?.taskId || null);
    }
  }, [onAgentClose, currentActiveTab, agentsList]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("flex flex-col h-full w-full", className)}>
        {/* Header - cleaner design */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <BotIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">子 Agent</span>
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {agentsList.length}
            </Badge>
          </div>
        </div>

        {/* Tabs - improved horizontal scroll and spacing */}
        <Tabs
          value={currentActiveTab || undefined}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          {/* Tab list - horizontal scroll with better spacing */}
          <div className="border-b bg-muted/10 px-2 pt-2">
            <TabsList className="h-auto bg-transparent w-full justify-start overflow-x-auto gap-1 scrollbar-hide">
              {agentsList.map((agent) => (
                <Tooltip key={agent.taskId}>
                  <TooltipTrigger asChild>
                    <TabsTrigger
                      value={agent.taskId}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 text-xs whitespace-nowrap",
                        "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                        "border-b-2 border-transparent data-[state=active]:border-primary",
                        "rounded-t-lg rounded-b-none min-w-[80px] max-w-[140px]"
                      )}
                    >
                      <StatusIcon status={agent.status} size="sm" />
                      <span className="truncate flex-1">
                        {agent.task?.slice(0, 10) || agent.taskId.slice(0, 6)}
                      </span>
                      {agent.status === "running" && (
                        <Loader2Icon className="size-2.5 animate-spin shrink-0" />
                      )}
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="text-xs">{agent.task || agent.taskId}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </div>

          {/* Tab content - only render active tab for performance */}
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
