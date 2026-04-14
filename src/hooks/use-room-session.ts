"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  appendRoomMessages,
  appendRoomMessage,
  ensureRoom,
  getRoomConfig,
  getRoomMessages,
  getRoomPromptRevisions,
  getRoomTurnState,
  saveRoomPromptRevision,
  upsertRoomConfig,
  upsertRoomTurnState,
} from "@/lib/storage";
import type {
  RoomConfig,
  RoomGenerationResponse,
  RoomPromptRevision,
  RoomTurnState,
  SharedMessage,
} from "@/lib/room/types";
import { createTextSharedMessage } from "@/lib/room/message-share-filter";

interface ModelConfig {
  providerId: string;
  modelId: string;
  apiKey?: string;
}

interface UseRoomSessionOptions {
  roomId: string;
  modelConfig?: ModelConfig;
}

export interface UseRoomSessionResult {
  isReady: boolean;
  isRunning: boolean;
  error: string | null;
  roomConfig: RoomConfig | null;
  turnState: RoomTurnState | null;
  messages: SharedMessage[];
  streamingMessage: SharedMessage | null;
  promptRevisions: RoomPromptRevision[];
  addUserMessage: (text: string) => Promise<void>;
  runNextTurn: () => Promise<void>;
  updateRoomConfig: (nextConfig: RoomConfig) => Promise<void>;
}

export function useRoomSession(options: UseRoomSessionOptions): UseRoomSessionResult {
  const { roomId, modelConfig } = options;

  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [turnState, setTurnState] = useState<RoomTurnState | null>(null);
  const [messages, setMessages] = useState<SharedMessage[]>([]);
  const [streamingMessage, setStreamingMessage] = useState<SharedMessage | null>(null);
  const [promptRevisions, setPromptRevisions] = useState<RoomPromptRevision[]>([]);

  const nextTurnNo = useMemo(() => {
    if (messages.length === 0) {
      return 1;
    }
    return Math.max(...messages.map(message => message.turnNo)) + 1;
  }, [messages]);

  const mergeMessagesById = useCallback((base: SharedMessage[], incoming: SharedMessage[]) => {
    if (incoming.length === 0) {
      return base;
    }
    const next = [...base];
    for (const message of incoming) {
      const index = next.findIndex(item => item.id === message.id);
      if (index >= 0) {
        next[index] = message;
      } else {
        next.push(message);
      }
    }
    return next;
  }, []);

  useEffect(() => {
    let disposed = false;

    const load = async () => {
      try {
        setIsReady(false);
        setError(null);

        await ensureRoom(roomId);

        const [nextConfig, nextState, nextMessages, nextRevisions] = await Promise.all([
          getRoomConfig(roomId),
          getRoomTurnState(roomId),
          getRoomMessages(roomId),
          getRoomPromptRevisions(roomId),
        ]);

        if (disposed) {
          return;
        }

        setRoomConfig(nextConfig);
        setTurnState(nextState);
        setMessages(nextMessages);
        setPromptRevisions(nextRevisions);
        setIsReady(true);
      } catch (loadError) {
        if (disposed) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "加载交流室失败");
      }
    };

    void load();

    return () => {
      disposed = true;
    };
  }, [roomId]);

  const addUserMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const message = createTextSharedMessage({
      id: `room-msg-${crypto.randomUUID()}`,
      roomId,
      turnNo: nextTurnNo,
      actorType: "user",
      actorId: "user",
      actorName: "用户",
      text: trimmed,
      createdAt: dayjs().toISOString(),
      metadata: {
        messageKind: "user-input",
      },
    });

    await appendRoomMessage(message);
    setMessages(prev => [...prev, message]);
  }, [nextTurnNo, roomId]);

  const updateRoomConfig = useCallback(async (nextConfig: RoomConfig) => {
    setRoomConfig(nextConfig);
    await upsertRoomConfig(nextConfig);
  }, []);

  const runNextTurn = useCallback(async () => {
    if (!roomConfig || !turnState || isRunning) {
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setStreamingMessage(null);

      const response = await fetch("/api/room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          sharedMessages: messages,
          roomConfig,
          turnState,
          modelConfig,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "推进下一轮失败");
      }
      if (!response.body) {
        throw new Error("SSE 响应为空");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let eventData = "";
      let donePayload: RoomGenerationResponse | undefined;

      const handleEvent = (type: string, dataRaw: string) => {
        if (type === "start") {
          const start = JSON.parse(dataRaw) as {
            phase: "character" | "playwright";
            actorType: "character" | "playwright";
            actorId: string;
            actorName: string;
            turnNo: number;
          };
          setStreamingMessage({
            id: `room-stream-${crypto.randomUUID()}`,
            roomId,
            turnNo: start.turnNo,
            actorType: start.actorType,
            actorId: start.actorId,
            actorName: start.actorName,
            visibleParts: [{ type: "text", text: "" }],
            renderParts: [{ type: "text", text: "" }],
            createdAt: dayjs().toISOString(),
          });
          return;
        }

        if (type === "delta") {
          const delta = JSON.parse(dataRaw) as { text?: string; partType?: "text" | "reasoning" };
          const text = delta.text || "";
          const partType = delta.partType || "text";
          if (!text) {
            return;
          }
          setStreamingMessage((prev) => {
            if (!prev) {
              return prev;
            }
            const currentRenderParts = prev.renderParts || [];
            const lastRenderPart = currentRenderParts.at(-1);
            const nextRenderParts = lastRenderPart?.type === partType
              ? [
                  ...currentRenderParts.slice(0, -1),
                  {
                    ...lastRenderPart,
                    text: `${lastRenderPart.text}${text}`,
                  },
                ]
              : [
                  ...currentRenderParts,
                  {
                    type: partType,
                    text,
                  },
                ];

            let nextVisibleParts = prev.visibleParts;
            if (partType === "text") {
              const lastVisiblePart = prev.visibleParts.at(-1);
              nextVisibleParts = lastVisiblePart
                ? [
                    ...prev.visibleParts.slice(0, -1),
                    {
                      ...lastVisiblePart,
                      text: `${lastVisiblePart.text}${text}`,
                    },
                  ]
                : [
                    ...prev.visibleParts,
                    {
                      type: "text",
                      text,
                    },
                  ];
            }

            return {
              ...prev,
              visibleParts: nextVisibleParts,
              renderParts: nextRenderParts,
            };
          });
          return;
        }

        if (type === "done") {
          donePayload = JSON.parse(dataRaw) as RoomGenerationResponse;
          return;
        }

        if (type === "commit") {
          const commitPayload = JSON.parse(dataRaw) as { message?: SharedMessage };
          if (!commitPayload.message) {
            return;
          }
          setMessages(prev => mergeMessagesById(prev, [commitPayload.message!]));
          setStreamingMessage(null);
          return;
        }

        if (type === "error") {
          const errorPayload = JSON.parse(dataRaw) as { error?: string };
          throw new Error(errorPayload.error || "SSE 执行失败");
        }
      };

      const flushEvent = () => {
        if (!eventType || !eventData) {
          eventType = "";
          eventData = "";
          return;
        }
        handleEvent(eventType, eventData);
        eventType = "";
        eventData = "";
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          flushEvent();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const lines = block.split("\n");
          for (const line of lines) {
            if (!line.trim()) {
              continue;
            }
            if (line.startsWith("event:")) {
              eventType = line.slice("event:".length).trim();
            } else if (line.startsWith("data:")) {
              const dataLine = line.slice("data:".length).trim();
              eventData = eventData ? `${eventData}\n${dataLine}` : dataLine;
            }
          }
          flushEvent();
        }
      }

      if (!donePayload) {
        throw new Error("未收到 done 事件");
      }
      const resolvedPayload = donePayload;

      const persistedMessages = [
        ...(resolvedPayload.extraMessages || []),
        resolvedPayload.message,
      ];
      await appendRoomMessages(persistedMessages);
      await upsertRoomTurnState(resolvedPayload.turnState);

      setMessages(prev => mergeMessagesById(prev, persistedMessages));
      setTurnState(resolvedPayload.turnState);
      setStreamingMessage(null);

      if (resolvedPayload.roomConfig) {
        await upsertRoomConfig(resolvedPayload.roomConfig);
        setRoomConfig(resolvedPayload.roomConfig);
      }

      if (resolvedPayload.promptRevision) {
        await saveRoomPromptRevision(resolvedPayload.promptRevision);
        const revision = resolvedPayload.promptRevision;
        setPromptRevisions(prev => [revision, ...prev]);
      }
    } catch (runError) {
      setStreamingMessage(null);
      setError(runError instanceof Error ? runError.message : "推进下一轮失败");
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, mergeMessagesById, messages, modelConfig, roomConfig, roomId, turnState]);

  return {
    isReady,
    isRunning,
    error,
    roomConfig,
    turnState,
    messages,
    streamingMessage,
    promptRevisions,
    addUserMessage,
    runNextTurn,
    updateRoomConfig,
  };
}
