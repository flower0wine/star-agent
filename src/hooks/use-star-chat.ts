"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import type { GitHubRepo } from "@/lib/github/api";

export interface ChatMessage extends UIMessage {}

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

  const chat = useChat<UIMessage>({
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
