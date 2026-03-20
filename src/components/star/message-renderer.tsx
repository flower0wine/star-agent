"use client";

import {
  isReasoningUIPart,
  isStaticToolUIPart,
  isTextUIPart,
} from "ai";
import type { UIMessage, ToolUIPart, LanguageModelUsage } from "ai";

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
import { GitHubRepo } from "@/components/star/github-repo";
import {
  UserIcon,
  BotIcon,
  CopyIcon,
  RefreshCwIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  CheckIcon,
  LoaderIcon,
  ZapIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useCallback, useMemo } from "react";

// Helper type for tool output with repos
interface RepoToolOutput {
  repos?: Array<{
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    topics: string[];
    updated_at: string;
    owner: {
      login: string;
      avatar_url: string;
      html_url: string;
    };
    license: { spdx_id: string } | null;
    watchers_count: number;
    visibility: string;
  }>;
  repo?: {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    topics: string[];
    updated_at: string;
    owner: {
      login: string;
      avatar_url: string;
      html_url: string;
    };
    license: { spdx_id: string } | null;
    watchers_count: number;
    visibility: string;
  };
}

// Custom message type with usage metadata
type ChatMessageWithUsage = UIMessage<{ totalUsage?: LanguageModelUsage }>;

export interface MessageRendererProps {
  message: ChatMessageWithUsage;
  isStreaming?: boolean;
  isLastMessage?: boolean;
  onReload?: () => void;
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
 */
export function MessageRenderer({
  message,
  isStreaming = false,
  isLastMessage = false,
  onReload,
}: MessageRendererProps) {
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
          <MessageResponse key={`text-${i}`}>{part.text}</MessageResponse>
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
      if (part.type === "tool-displayRepositories") {
        switch (part.state) {
          case "input-streaming":
            return (
              <div key={`tool-displayRepositories-${i}`} className="flex items-center gap-2 text-muted-foreground text-sm">
                <LoaderIcon className="size-4 animate-spin" />
                Preparing repositories...
              </div>
            );
          case "output-available": {
            // 新的渐进式数据格式
            const data = part.output as {
              state: "loading" | "partial" | "complete";
              repos: RepoToolOutput["repos"];
              loaded: number;
              total: number;
              message: string;
              __duration?: number;
            };

            // Loading 状态
            if (data.state === "loading") {
              return (
                <div key={`tool-displayRepositories-${i}`} className="flex items-center gap-2 text-muted-foreground">
                  <LoaderIcon className="size-4 animate-spin" />
                  <span className="text-sm">{data.message}</span>
                </div>
              );
            }

            // Partial 或 Complete 状态 - 显示仓库列表
            if (data.repos && data.repos.length > 0) {
              return (
                <div key={`tool-displayRepositories-${i}`} className="space-y-3">
                  {/* 进度信息 */}
                  {data.state === "partial" && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <LoaderIcon className="size-3 animate-spin" />
                      <span>{data.message}</span>
                    </div>
                  )}
                  {data.state === "complete" && (
                    <div className="flex items-center justify-between text-muted-foreground text-sm">
                      <span>{data.message}</span>
                      {data.__duration !== undefined && (
                        <span className="text-xs">
                          {data.__duration < 1000
                            ? `${data.__duration}ms`
                            : `${(data.__duration / 1000).toFixed(1)}s`}
                        </span>
                      )}
                    </div>
                  )}
                  {/* 仓库列表 */}
                  <div className="max-h-150 overflow-auto">
                    <div className="space-y-3">
                      {data.repos.map((repo) => (
                        <GitHubRepo key={repo.id} repo={repo} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }
          case "output-error":
            return (
              <div key={`tool-displayRepositories-${i}`} className="text-destructive text-sm">
                Error: {part.errorText}
              </div>
            );
          default:
            return null;
        }
      }

      // 4. Other tools (使用默认 Tool 组件展示 JSON)
      if (isStaticToolUIPart(part)) {
        // Extract duration from output if available
        const output = part.output as Record<string, unknown> | undefined;
        const duration = output?.__duration as number | undefined;

        console.log(`[MessageRenderer] Tool ${part.type} duration:`, duration);

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
  }, [message.parts, isStreaming, isLastMessage]);

  return (
    <Message from={message.role}>
      {/* Render parts in original order */}
      <MessageContent>
        <div className="space-y-3">{renderParts}</div>
      </MessageContent>

      {/* Token usage display */}
      {message.role === "assistant" && !isStreaming && message.metadata?.totalUsage && (
        <>
          { }
          {console.log("[MessageRenderer] Token usage received:", message.metadata.totalUsage)}
          <div className="mt-2 flex items-center gap-3 rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <ZapIcon className="size-3.5" />
            <span>Tokens:</span>
            <span className="font-medium">{message.metadata.totalUsage.totalTokens}</span>
            <span className="text-muted-foreground/70">
              (in: {message.metadata.totalUsage.inputTokens || 0}, out: {message.metadata.totalUsage.outputTokens || 0})
            </span>
          </div>
        </>
      )}

      {/* Message toolbar for assistant messages */}
      {message.role === "assistant" && !isStreaming && (
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
}

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
