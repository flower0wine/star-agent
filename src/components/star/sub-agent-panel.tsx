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

import { useState, useMemo, memo } from "react";
import type { UIMessage, LanguageModelUsage } from "ai";
import type { SubAgentCard } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircleIcon,
  CircleIcon,
  Loader2Icon,
  XCircleIcon,
  BotIcon,
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
 * Status icon component - memoized
 */
const StatusIcon = memo(({
  status,
  className,
}: {
  status: SubAgentCard["status"];
  className?: string;
}) => {
  switch (status) {
    case "pending":
      return (
        <CircleIcon
          className={cn("size-3.5 text-muted-foreground", className)}
        />
      );
    case "running":
      return (
        <Loader2Icon
          className={cn("size-3.5 text-blue-500 animate-spin", className)}
        />
      );
    case "completed":
      return (
        <CheckCircleIcon
          className={cn("size-3.5 text-green-500", className)}
        />
      );
    case "failed":
      return (
        <XCircleIcon className={cn("size-3.5 text-destructive", className)} />
      );
    default:
      return null;
  }
});

// Type assertion for message compatibility with MessageRenderer
type MessageForRenderer = UIMessage & { metadata?: { totalUsage?: LanguageModelUsage } };

/**
 * Sub-Agent Tab component - memoized
 */
const SubAgentTab = memo(({
  agent,
  messages,
}: {
  agent: SubAgentCard;
  messages: UIMessage[];
}) => {
  const isStreaming = agent.status === "running";

  return (
    <div className="flex flex-col h-full">
      {/* Tab header info */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusIcon status={agent.status} />
          <span className="text-xs font-medium truncate flex-1">
            {agent.task || agent.taskId.slice(0, 12)}...
          </span>
        </div>
        <Badge variant="outline" className="text-xs ml-2 shrink-0">
          {agent.reposCount} repos
        </Badge>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
              {isStreaming ? (
                <div className="flex items-center gap-2">
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>处理中...</span>
                </div>
              ) : (
                <span>暂无消息</span>
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

          {/* Show loading indicator when streaming and no messages yet */}
          {isStreaming && messages.length === 0 && (
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
}: SubAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Memoize agentsList to prevent unnecessary re-renders
  const agentsList = useMemo(() => [...agents.values()], [agents]);

  // Don't render if no agents
  if (agentsList.length === 0) {
    return null;
  }

  // Auto-select first tab when agents change
  const firstAgentId = agentsList[0]?.taskId;
  const currentActiveTab = activeTab && agents.has(activeTab) ? activeTab : firstAgentId;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <BotIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">子 Agent</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {agentsList.length}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs
        value={currentActiveTab || undefined}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Tab list */}
        <div className="border-b bg-muted/20 px-2 pt-2">
          <TabsList className="h-auto bg-transparent w-full justify-start overflow-x-auto">
            {agentsList.map((agent) => (
              <TabsTrigger
                key={agent.taskId}
                value={agent.taskId}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs",
                  "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                  "border-b-2 border-transparent data-[state=active]:border-primary",
                  "rounded-t-lg rounded-b-none"
                )}
              >
                <StatusIcon status={agent.status} />
                <span className="truncate max-w-[100px]">
                  {agent.task?.slice(0, 8) || agent.taskId.slice(0, 8)}...
                </span>
                {agent.status === "running" && (
                  <Loader2Icon className="size-3 animate-spin shrink-0" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Tab content - only render active tab */}
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
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export { SubAgentPanel as SubAgentPanelComponent };
