/**
 * Chat Page
 *
 * Generic chat page that supports multiple agents.
 * Enhanced with SubAgentPanel for Master Agent.
 */

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useSubAgentMessages } from "@/hooks/use-sub-agent-messages";
import type { GitHubRepo } from "@/lib/github/api";
import type { ChatOnDataCallback, UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  MessageRenderer,
  MessageLoadingIndicator,
} from "@/components/star";
import { SubAgentPanel } from "@/components/star/sub-agent-panel";
import { AgentSelector } from "@/components/agents/agent-selector";
import type { AgentId } from "@/components/agents/agent-selector";
import { StarLogin } from "@/components/star/star-login";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BotIcon,
  Loader2Icon,
  LogOutIcon,
  HelpCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { SubAgentCard } from "@/types/agent";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

interface StarContext {
  username: string;
  repos: GitHubRepo[];
}

export default function ChatPage() {
  // Agent selection
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("star");

  // Star Agent state
  const [starContext, setStarContext] = useState<StarContext | null>(null);
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Sub-agent messages state (for Master Agent)
  const {
    subAgentMessages,
    subAgentCards,
    processChunk,
    handleProgress,
    reset: resetSubAgentMessages,
    removeSubAgent,
  } = useSubAgentMessages();

  // Close agent handler
  const handleAgentClose = useCallback((taskId: string) => {
    removeSubAgent(taskId);
  }, [removeSubAgent]);

  // Chat state
  const [input, setInput] = useState("");

  // Define sub-agent progress data type
  interface SubAgentProgressData {
    taskId: string;
    progressType?: string;
    chunk?: unknown;
    error?: string;
    result?: string;
    progress?: number;
  }

  // Handler for custom data parts (sub-agent progress)
  const handleData: ChatOnDataCallback<UIMessage<{ totalUsage: unknown }>> = useCallback(
    (dataPart) => {
      // Check if this is a data-subagent event
      if (dataPart.type !== "data-subagent")
        return;

      const subData = dataPart.data as SubAgentProgressData;
      const taskId = subData.taskId;
      if (!taskId)
        return;

      const { progressType, chunk, error, result, progress } = subData;

      // Log all message-chunk events for debugging
      if (progressType === "message-chunk" && chunk) {
        processChunk(taskId, chunk);
      } else {
        // Handle other progress types (start, progress, complete, error)
        handleProgress(taskId, progressType || "progress", progress, result, error);
      }
    },
    [processChunk, handleProgress]
  );

  const { messages, sendMessage, status, error: chatError, regenerate, stop }
    = useAgentChat({
      api: "/api/chat",
      agentId: selectedAgent,
      context:
        selectedAgent === "star" || selectedAgent === "master"
          ? { username, repos }
          : {},
      onData: handleData,
    });

  // Check localStorage on mount for saved user data (Star Agent)
  useEffect(() => {
    const savedUsername = localStorage.getItem("star_username");
    const savedRepos = localStorage.getItem("star_repos");

    if (savedUsername && savedRepos) {
      try {
        setUsername(savedUsername);
        setRepos(JSON.parse(savedRepos));
        setIsVerified(true);
      } catch {
        localStorage.removeItem("star_username");
        localStorage.removeItem("star_repos");
      }
    }
  }, []);

  // Extract sub-agent task IDs from messages (for Master Agent)
  useEffect(() => {
    if (selectedAgent !== "master") {
      resetSubAgentMessages();
      return;
    }

    // Scan messages for createSubAgent tool calls
    messages.forEach((message) => {
      if (message.role !== "assistant")
        return;

      // Access parts - each part could be a tool call
      message.parts.forEach((part: unknown) => {
        if (!part || typeof part !== "object")
          return;

        const p = part as Record<string, unknown>;

        // Check for tool call result with taskId
        if (
          p.type === "tool-result"
          && p.toolCallId
          && p.result
          && typeof p.result === "object"
        ) {
          const result = p.result as Record<string, unknown>;

          // Check if this is a createSubAgent result
          if (
            result.taskId
            && typeof result.taskId === "string"
            && result.taskId.startsWith("subagent-")
          ) {
            // Add card if not exists - use handleProgress for proper initialization
            handleProgress(result.taskId, "start", 0);
          }
        }
      });
    });
  }, [messages, selectedAgent, handleProgress, resetSubAgentMessages]);

  const isChatLoading = status === "submitted" || status === "streaming";
  const isLastMessage = messages.length > 0;

  // Handle username submission (Star Agent)
  const handleUsernameSubmit = useCallback(
    async (inputUsername: string) => {
      setIsLoading(true);
      setUsernameError(null);

      try {
        const response = await fetch(`/api/github/stars/${inputUsername}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch repositories");
        }
        const data = await response.json();
        localStorage.setItem("star_username", inputUsername);
        localStorage.setItem("star_repos", JSON.stringify(data.repos));
        setRepos(data.repos);
        setUsername(inputUsername);
        setIsVerified(true);
      } catch (err) {
        setUsernameError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Handle logout (Star Agent)
  const handleLogout = useCallback(() => {
    localStorage.removeItem("star_username");
    localStorage.removeItem("star_repos");
    setUsername("");
    setRepos([]);
    setIsVerified(false);
    setInput("");
    resetSubAgentMessages();
  }, [resetSubAgentMessages]);

  // Handle chat submit - use ref to avoid dependency on input state
  const inputValueRef = useRef(input);
  inputValueRef.current = input;

  const handleChatSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValueRef.current;
      if (!text.trim() || isChatLoading)
        return;

      setInput("");
      await sendMessage({ text });
    },
    [isChatLoading, sendMessage]
  );

  // Handle stop generation
  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  // Optimized input handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChatSubmit(e as unknown as React.FormEvent);
      }
    },
    [handleChatSubmit]
  );

  // Show agent selector if no agent-specific requirements
  // For now, we show the chat interface based on agent selection

  // Star Agent and Master Agent require username verification
  if ((selectedAgent === "star" || selectedAgent === "master") && !isVerified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <AgentSelector
          selectedAgentId={selectedAgent}
          onSelect={(id) => setSelectedAgent(id as AgentId)}
          className="mb-8"
        />
        <StarLogin
          onSubmit={handleUsernameSubmit}
          error={usernameError}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Show logout button for Master Agent
  const showLogout = selectedAgent === "master" || selectedAgent === "star";

  const suggestedQuestions = selectedAgent === "star"
    ? [
        "Show me my most starred repositories",
        "What languages do I use most?",
        "Find repositories without README"
      ]
    : [
        "展示所有的AI语音项目",
        "查看最近的提交",
        "Generate release notes"
      ];

  const handleSuggestionClick = (question: string) => {
    setInput(question);
  };

  // Extract chat content JSX to eliminate duplication
  const chatContent = (
    <>
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-secondary/15 rounded-full blur-2xl animate-pulse" />
                  <div className="relative size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 flex items-center justify-center">
                    <BotIcon className="size-10 text-primary/60" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-foreground/90 mb-1">
                  {selectedAgent === "star"
                    ? `Welcome back, @${username}`
                    : "Ready to assist"}
                </h2>
                <p className="text-sm text-muted-foreground/70 mb-6 text-center max-w-md">
                  {selectedAgent === "star"
                    ? "Ask me anything about your GitHub repositories."
                    : "Select an agent and start chatting."}
                </p>

                {/* Suggested questions */}
                <div className="w-full max-w-xl space-y-2.5">
                  <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider text-center">
                    Try asking
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestedQuestions.map((question, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(question)}
                        className="group flex items-start gap-2.5 p-3 rounded-lg border border-border/40 bg-background/40 hover:bg-primary/5 hover:border-primary/40 hover:shadow-md transition-all duration-200 text-left"
                      >
                        <HelpCircleIcon className="size-4 mt-0.5 text-muted-foreground/40 group-hover:text-primary/70 shrink-0 transition-colors" />
                        <span className="text-sm text-muted-foreground/70 group-hover:text-foreground/90 transition-colors">
                          {question}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index === messages.length - 1 ? 0 : 0 }}
                  >
                    <MessageRenderer
                      message={message}
                      isStreaming={
                        isChatLoading && index === messages.length - 1
                      }
                      isLastMessage={index === messages.length - 1}
                      onReload={
                        index === messages.length - 1 ? regenerate : undefined
                      }
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {chatError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-3xl mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive backdrop-blur-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircleIcon className="shrink-0 size-4" />
                <span className="font-medium">Error:</span>
                <span>{chatError.message || String(chatError)}</span>
              </div>
            </motion.div>
          )}

          {isChatLoading && !isLastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <MessageLoadingIndicator />
            </motion.div>
          )}
        </ConversationContent>
      </Conversation>

      {/* Input Area */}
      <div className="relative z-10 border-t border-border/20 bg-gradient-to-t from-background/95 to-background/80 backdrop-blur-sm px-4 py-4 shrink-0">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleChatSubmit} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition duration-300" />
            <div className="relative">
              <Textarea
                value={input}
                onChange={handleInputChange}
                placeholder={
                  selectedAgent === "star"
                    ? "Ask about your repositories..."
                    : "Type your message..."
                }
                className="min-h-[48px] max-h-[200px] w-full resize-none rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm py-3 pl-4 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200"
                rows={1}
                onKeyDown={handleTextareaKeyDown}
              />
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                {input.trim() && (
                  <span className="text-[10px] text-muted-foreground/40 mr-1 hidden sm:inline">
                    Enter ⏎
                  </span>
                )}
                <Button
                  type={isChatLoading ? "button" : "submit"}
                  size="icon"
                  className="size-7 rounded-lg bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all duration-200 disabled:opacity-40"
                  disabled={!input.trim() && !isChatLoading}
                  onClick={isChatLoading ? handleStop : undefined}
                  aria-label={isChatLoading ? "Stop generating" : "Send message"}
                >
                  {isChatLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Loader2Icon className="size-3.5" />
                    </motion.div>
                  ) : (
                    <ArrowRightIcon className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
            AI may make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </>
  );

  // Chat interface
  return (
    <div className="flex min-h-screen flex-col relative overflow-hidden">
      {/* Decorative background - simplified */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-80 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-gradient-to-tr from-secondary/5 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 bg-background/60 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AgentSelector
              selectedAgentId={selectedAgent}
              onSelect={(id) => {
                setSelectedAgent(id as AgentId);
                if (id !== "star" && id !== "master") {
                  setIsVerified(false);
                }
              }}
            />
            {selectedAgent === "star" && username && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-foreground/80">@{username}</span>
              </div>
            )}
          </div>
          {showLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 gap-1.5"
            >
              <LogOutIcon className="size-4" />
              <span className="hidden sm:inline">退出登录</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col flex-1">
        {selectedAgent === "master" && subAgentCards.size > 0 ? (
          <ResizablePanelGroup orientation="horizontal" className="flex-1">
            {/* Chat Area */}
            <ResizablePanel defaultSize="50%" minSize="35%" maxSize="65%">
              <div className="flex flex-col h-full">
                {chatContent}
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle />

            {/* Sub-Agent Panel */}
            <ResizablePanel defaultSize="50%">
              <SubAgentPanel
                agents={subAgentCards}
                messages={subAgentMessages}
                onAgentClose={handleAgentClose}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          /* Chat Area without SubAgent Panel */
          <div className="flex-1 flex flex-col min-w-0">
            {chatContent}
          </div>
        )}
      </div>
    </div>
  );
}
