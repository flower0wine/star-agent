"use client";

import { useState, useCallback, useEffect } from "react";
import { useStarChat } from "@/hooks/use-star-chat";
import type { GitHubRepo } from "@/lib/github/api";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  StarLogin,
  StarChatHeader,
  MessageRenderer,
  MessageLoadingIndicator,
} from "@/components/star";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BotIcon, Loader2Icon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function StarChatPage() {
  const [username, setUsername] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error: chatError, regenerate }
    = useStarChat({
      api: "/api/chat",
      username,
      repos,
    });

  // Check localStorage on mount for saved user data
  useEffect(() => {
    const savedUsername = localStorage.getItem("star_username");
    const savedRepos = localStorage.getItem("star_repos");

    if (savedUsername && savedRepos) {
      try {
        setUsername(savedUsername);
        setRepos(JSON.parse(savedRepos));
        setIsVerified(true);
      } catch {
        // Invalid data in localStorage, clear it
        localStorage.removeItem("star_username");
        localStorage.removeItem("star_repos");
      }
    }
  }, []);

  const isChatLoading = status === "submitted" || status === "streaming";
  const isLastMessage = messages.length > 0;

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
        // Store in localStorage and state to avoid re-fetching
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

  const handleLogout = useCallback(() => {
    localStorage.removeItem("star_username");
    localStorage.removeItem("star_repos");
    setUsername("");
    setRepos([]);
    setIsVerified(false);
    setInput("");
  }, []);

  const handleChatSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isChatLoading)
        return;

      await sendMessage({ text: input });
      setInput("");
    },
    [input, isChatLoading, sendMessage]
  );

  // Show username input screen
  if (!isVerified) {
    return (
      <StarLogin
        onSubmit={handleUsernameSubmit}
        error={usernameError}
        isLoading={isLoading}
      />
    );
  }

  // Show chat interface
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <StarChatHeader
        username={username}
        messageCount={messages.length}
        onLogout={handleLogout}
      />

      {/* Chat Area */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title="Start exploring your stars"
                description="Ask me anything about your repositories. I'll help you find what you're looking for."
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
                    isStreaming={isChatLoading && index === messages.length - 1}
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
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about your repositories..."
              className="min-h-[52px] w-full resize-none rounded-xl border bg-background py-3 pl-4 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleChatSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-2 right-2 size-8"
              disabled={!input.trim() || isChatLoading}
            >
              {isChatLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
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
  );
}
