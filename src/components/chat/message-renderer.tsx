"use client";

import {
  isReasoningUIPart,
  isStaticToolUIPart,
  isTextUIPart,
} from "ai";
import type { UIMessage } from "ai";

import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  DisplayRepositoriesToolPart,
  SearchPatentsToolPart,
  CreateCharacterToolPart,
  SetWorldBlueprintToolPart,
  StartRoleCycleToolPart,
} from "./tool-parts";
import {
  UserIcon,
  BotIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  CheckIcon,
  LoaderIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useCallback, useMemo, memo } from "react";
import { ChatMessageMetrics } from "./metadata";
import type { ChatMessageMetadata } from "@/lib/chat/message-metadata";
import { cn } from "@/lib/utils";

// Custom message type with usage metadata
type ChatMessageWithUsage = UIMessage<ChatMessageMetadata>;

export interface MessageRendererProps {
  message: ChatMessageWithUsage;
  isStreaming?: boolean;
  isLastMessage?: boolean;
  assistantDisplayName?: string;
  messageMetaText?: string;
  contentClassName?: string;
  showToolbar?: boolean;
  showMetrics?: boolean;
  onReload?: () => void;
  onOpenSubAgentPanel?: (payload: {
    taskId: string;
    task?: string;
  }) => void;
}

interface CreateSubAgentToolOutput {
  taskId?: string;
  status?: "launched" | "failed";
  message?: string;
  error?: string;
  code?: string;
  recoverable?: true;
  async?: true;
  __duration?: number;
  subAgent?: {
    profileId?: string;
    profileVersion?: number;
    originTool?: string;
  };
}

interface CreateSubAgentToolInput {
  task?: string;
  [key: string]: unknown;
}

interface SubAgentToolPart {
  type: string;
  state?: "input-streaming" | "output-available" | "output-error" | string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function isSubAgentToolPart(part: unknown): part is SubAgentToolPart {
  if (!part || typeof part !== "object") {
    return false;
  }
  const candidate = part as Record<string, unknown>;
  if (!("type" in candidate) || typeof candidate.type !== "string" || !candidate.type.startsWith("tool-")) {
    return false;
  }

  const output = candidate.output;
  if (!output || typeof output !== "object") {
    return false;
  }
  return "subAgent" in (output as Record<string, unknown>);
}

/**
 * MessageRenderer - Renders AI chat messages with support for:
 * - Reasoning (thinking process) - rendered separately, collapsible
 * - Tool invocations and results
 * - Text content
 * - Message actions (copy, regenerate, rate)
 *
 * Structure:
 * - Reasoning (outside, collapsible, with BrainIcon)
 * - MessageContent (contains tool calls and text response)
 *
 * Performance: memoized to only re-render when message content actually changes
 */
export const MessageRenderer = memo(({
  message,
  isStreaming = false,
  isLastMessage = false,
  assistantDisplayName,
  messageMetaText,
  contentClassName,
  showToolbar = true,
  showMetrics = true,
  onReload,
  onOpenSubAgentPanel,
}: MessageRendererProps) => {
  const [copied, setCopied] = useState(false);

  // Extract text content for copy functionality
  const textContent = useMemo(() => {
    return message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("");
  }, [message.parts]);

  const handleCopy = useCallback(async () => {
    if (textContent) {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(setCopied, 2000, false);
    }
  }, [textContent]);

  // Extract text content for copy functionality
  const renderParts = useMemo(() => {
    return message.parts.map((part, i) => {
      // 1. Text content
      if (isTextUIPart(part)) {
        return (
          <MessageResponse
            key={`text-${i}`}
            isAnimating={isStreaming && isLastMessage && i === message.parts.length - 1}
          >
            {part.text}
          </MessageResponse>
        );
      }

      // 2. Reasoning/Thinking content
      if (isReasoningUIPart(part)) {
        return (
          <Reasoning
            key={`reasoning-${i}`}
            isStreaming={
              isStreaming && isLastMessage && i === message.parts.length - 1
            }
            className="w-full"
          >
            <ReasoningTrigger />
            <ReasoningContent>{part.text}</ReasoningContent>
          </Reasoning>
        );
      }

      // 3. Display Repositories Tool - 专门的 UI 展示工具 (支持渐进式加载)
      if (isSubAgentToolPart(part)) {
        const toolType = typeof part.type === "string" ? part.type : "tool-subAgent";
        if (part.state === "input-streaming") {
          return (
            <div key={`${toolType}-${i}`} className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-muted-foreground text-sm">
              <LoaderIcon className="size-4 animate-spin" />
              正在创建子 Agent...
            </div>
          );
        }

        if (part.state === "output-available") {
          const output = (part.output || {}) as CreateSubAgentToolOutput;
          const input = (part.input || {}) as CreateSubAgentToolInput;
          const isFailed = output.status === "failed";
          const dynamicParamEntries = Object.entries(input).filter(([key]) => key !== "task");
          const taskId = output.taskId;
          const subAgentLabel = [output.subAgent?.profileId]
            .filter(Boolean)
            .join(" / ");
          const canOpen = Boolean(taskId && onOpenSubAgentPanel);

          const body = (
            <div className="w-full rounded-xl border border-border/70 bg-muted/15 px-3 py-3 text-left transition hover:border-primary/35 hover:bg-muted/25">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <div className={`mt-0.5 rounded-md p-1.5 ${isFailed ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                    <BotIcon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{isFailed ? "子 Agent 创建失败" : "子 Agent 已创建"}</div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {output.message || (isFailed ? "请根据错误提示修复后重试" : "任务已分配到子 Agent 处理")}
                    </div>
                  </div>
                </div>
                {canOpen && (
                  <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
              </div>
              {isFailed && output.error && (
                <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                  {output.error}
                  {output.code ? ` (${output.code})` : ""}
                </div>
              )}
              {output.subAgent?.profileId && (
                <div className="mt-2 rounded-md bg-background/70 px-2 py-1.5 text-xs text-foreground/90">
                  <span className="font-medium">SubAgent:</span> {output.subAgent.profileId}
                </div>
              )}
              {input.task && (
                <div className="mt-2 rounded-md border border-border/70 bg-background/70 px-2 py-1.5 text-xs text-foreground/90">
                  <span className="font-medium">Task:</span> {input.task}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {dynamicParamEntries.map(([key, value]) => (
                  <span key={`${toolType}-${i}-${key}`} className="rounded-md border border-border/80 px-2 py-0.5 text-muted-foreground">
                    {key}: {String(value)}
                  </span>
                ))}
                {subAgentLabel && (
                  <span className="rounded-md border border-border/80 px-2 py-0.5 text-muted-foreground">
                    {subAgentLabel}
                  </span>
                )}
                {taskId && (
                  <span className="rounded-md border border-border/80 px-2 py-0.5 text-muted-foreground">
                    {taskId}
                  </span>
                )}
                {output.status && (
                  <span className="rounded-md border border-border/80 px-2 py-0.5 text-muted-foreground">
                    {output.status}
                  </span>
                )}
                {output.__duration !== undefined && (
                  <span className="rounded-md border border-border/80 px-2 py-0.5 text-muted-foreground">
                    {output.__duration < 1000
                      ? `${output.__duration}ms`
                      : `${(output.__duration / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>
            </div>
          );

          if (canOpen && taskId) {
            return (
              <button
                key={`${toolType}-${i}`}
                type="button"
                className="block w-full"
                onClick={() => onOpenSubAgentPanel?.({
                  taskId,
                  task: subAgentLabel,
                })}
              >
                {body}
              </button>
            );
          }

          return <div key={`${toolType}-${i}`}>{body}</div>;
        }

        if (part.state === "output-error") {
          return (
            <div key={`${toolType}-${i}`} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              创建子 Agent 失败: {part.errorText}
            </div>
          );
        }

        return null;
      }

      const partType = typeof part === "object" && part !== null && "type" in part
        ? (part as { type?: unknown }).type
        : undefined;

      if (partType === "tool-displayRepositories" && isStaticToolUIPart(part)) {
        return (
          <DisplayRepositoriesToolPart
            key={`tool-displayRepositories-${i}`}
            part={part}
            itemKey={`tool-displayRepositories-${i}`}
          />
        );
      }

      if (typeof part === "object" && part !== null && "type" in part) {
        const summaryPart = part as { type?: unknown; text?: unknown };
        if (summaryPart.type === "tool-summary") {
          return (
            <div
              key={`tool-summary-${i}`}
              className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground text-sm"
            >
              {typeof summaryPart.text === "string" ? summaryPart.text : ""}
            </div>
          );
        }
      }

      if (partType === "tool-searchPatents" && isStaticToolUIPart(part)) {
        return (
          <SearchPatentsToolPart
            key={`tool-searchPatents-${i}`}
            part={part}
            itemKey={`tool-searchPatents-${i}`}
          />
        );
      }

      if (partType === "tool-createCharacter") {
        return (
          <CreateCharacterToolPart
            key={`tool-createCharacter-${i}`}
            part={part as any}
            itemKey={`tool-createCharacter-${i}`}
          />
        );
      }

      if (partType === "tool-setWorldBlueprint") {
        return (
          <SetWorldBlueprintToolPart
            key={`tool-setWorldBlueprint-${i}`}
            part={part as any}
            itemKey={`tool-setWorldBlueprint-${i}`}
          />
        );
      }

      if (partType === "tool-startRoleCycle") {
        return (
          <StartRoleCycleToolPart
            key={`tool-startRoleCycle-${i}`}
            part={part as any}
            itemKey={`tool-startRoleCycle-${i}`}
          />
        );
      }

      // 4. Other tools (使用默认 Tool 组件展示 JSON)
      if (isStaticToolUIPart(part)) {
        // Extract duration from output if available
        const output = part.output as Record<string, unknown> | undefined;
        const duration = output?.__duration as number | undefined;

        return (
          <Tool key={`tool-${i}`}>
            <ToolHeader type={part.type} state={part.state} duration={duration} />
            <ToolContent>
              <ToolInput input={part.input} />
              {part.state === "output-available" && (
                <ToolOutput
                  output={part.output}
                  errorText={part.errorText}
                />
              )}
              {part.state === "output-error" && (
                <ToolOutput output={undefined} errorText={part.errorText} />
              )}
            </ToolContent>
          </Tool>
        );
      }

      return null;
    });
  }, [message.parts, isStreaming, isLastMessage, onOpenSubAgentPanel]);


  return (
    <Message from={message.role}>
      {/* Render parts in original order */}
      <MessageContent className={cn(contentClassName)}>
        {(assistantDisplayName || messageMetaText) && (
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
            {assistantDisplayName && (
              <span className="font-medium text-foreground/85">{assistantDisplayName}</span>
            )}
            {messageMetaText && (
              <span>{messageMetaText}</span>
            )}
          </div>
        )}
        <div className="space-y-3">{renderParts}</div>
      </MessageContent>

      {/* Message usage and timing */}
      {message.role === "assistant" && !isStreaming && showMetrics && (
        <ChatMessageMetrics
          usage={message.metadata?.totalUsage}
          timing={message.metadata?.timing}
        />
      )}

      {/* Message toolbar for assistant messages */}
      {message.role === "assistant" && !isStreaming && showToolbar && (
        <MessageToolbar>
          <MessageActions>
            <MessageAction
              tooltip={copied ? "Copied!" : "Copy"}
              onClick={handleCopy}
            >
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            </MessageAction>
            <MessageAction tooltip="Good response">
              <ThumbsUpIcon className="size-4" />
            </MessageAction>
            <MessageAction tooltip="Bad response">
              <ThumbsDownIcon className="size-4" />
            </MessageAction>
            {onReload && (
              <MessageAction tooltip="Regenerate" onClick={onReload}>
                <RefreshCwIcon className="size-4" />
              </MessageAction>
            )}
          </MessageActions>
        </MessageToolbar>
      )}
    </Message>
  );
});

/**
 * Avatar component for user/assistant messages
 */
export function MessageAvatar({ role }: { role: UIMessage["role"] }) {
  return (
    <Avatar className="size-8">
      <AvatarFallback className={role === "user" ? "bg-primary" : "bg-secondary"}>
        {role === "user" ? (
          <UserIcon className="size-4" />
        ) : (
          <BotIcon className="size-4" />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Loading indicator for streaming responses
 */
export function MessageLoadingIndicator() {
  return (
    <Message from="assistant">
      <MessageContent>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-current" />
          </span>
          <span className="text-sm">Thinking...</span>
        </div>
      </MessageContent>
    </Message>
  );
}
