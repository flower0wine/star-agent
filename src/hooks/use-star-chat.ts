"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage, LanguageModelUsage } from "ai";
import { DefaultChatTransport } from "ai";
import type { GitHubRepo } from "@/lib/github/api";

// Custom metadata type matching the server
export interface ChatMessage extends UIMessage<{ totalUsage: LanguageModelUsage }> {}

interface UseStarChatOptions {
  api?: string;
  username: string;
  repos?: GitHubRepo[];
}

export function useStarChat({
  api = "/api/chat",
  username,
  repos = [],
}: UseStarChatOptions) {
  const usernameRef = useRef(username);
  const reposRef = useRef(repos);

  // Always keep refs updated
  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    reposRef.current = repos;
  }, [repos]);

  const chat = useChat<ChatMessage>({
    id: "star-chat",
    transport: new DefaultChatTransport({
      api,
      credentials: "same-origin",
    }),
  });

  const sendMessage = async (message: { text: string }) => {
    await chat.sendMessage(message, {
      body: {
        username: usernameRef.current,
        repos: reposRef.current,
      },
    });
  };

  return {
    ...chat,
    sendMessage,
  };
}
