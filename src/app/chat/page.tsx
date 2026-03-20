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
import { BotIcon, Loader2Icon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { SubAgentCard } from "@/types/agent";

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
  } = useSubAgentMessages();

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

  // Chat interface
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <AgentSelector
          selectedAgentId={selectedAgent}
          onSelect={(id) => {
            setSelectedAgent(id as AgentId);
            if (id !== "star" && id !== "master") {
              setIsVerified(false);
            }
          }}
        />
        {showLogout && (
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            退出登录
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Conversation className="flex-1 min-h-0">
            <ConversationContent>
              <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                  <ConversationEmptyState
                    title="Start chatting"
                    description={
                      selectedAgent === "star"
                        ? "Ask me anything about your repositories."
                        : "Select an agent and start chatting."
                    }
                    icon={<BotIcon className="size-12" />}
                  />
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
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
                  ))
                )}
              </AnimatePresence>

              {chatError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
                >
                  Error: {chatError.message || String(chatError)}
                </motion.div>
              )}

              {isChatLoading && !isLastMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <MessageLoadingIndicator />
                </motion.div>
              )}
            </ConversationContent>
          </Conversation>

          {/* Input Area */}
          <div className="sticky bottom-0 border-t bg-background px-4 py-3">
            <div className="mx-auto max-w-3xl">
              <form onSubmit={handleChatSubmit} className="relative">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder={
                    selectedAgent === "star"
                      ? "Ask me about your repositories..."
                      : "Type your message..."
                  }
                  className="min-h-[52px] w-full resize-none rounded-xl border bg-background py-3 pl-4 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={1}
                  onKeyDown={handleTextareaKeyDown}
                />
                <Button
                  type={isChatLoading ? "button" : "submit"}
                  size="icon"
                  className="absolute bottom-2 right-2 size-8"
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
                      <Loader2Icon className="size-4" />
                    </motion.div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  )}
                </Button>
              </form>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                AI can make mistakes. Please verify important information.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Agent Panel (only for Master Agent) */}
        {selectedAgent === "master" && (
          <div className="w-96 border-l bg-background shrink-0">
            <SubAgentPanel
              agents={subAgentCards}
              messages={subAgentMessages}
            />
          </div>
        )}
      </div>
    </div>
  );
}
