"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PauseIcon, PlayIcon } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { useRoomSession } from "@/hooks/use-room-session";
import { RoomStatusBar } from "./room-status-bar";
import { RoomChatMessageList } from "./room-chat-message-list";
import { RoomDirectorPanel } from "./room-director-panel";
import { RoomCharacterPanel } from "./room-character-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RoomChatViewProps {
  roomId: string;
}

export function RoomChatView({ roomId }: RoomChatViewProps) {
  const [input, setInput] = useState("");
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const [autoRunDelayMs, setAutoRunDelayMs] = useState(800);

  const { defaultProviderId, defaultModelId, providerApiKeys } = useSettingsStore();
  const modelConfig = useMemo(() => {
    if (!defaultProviderId || !defaultModelId) {
      return undefined;
    }
    return {
      providerId: defaultProviderId,
      modelId: defaultModelId,
      apiKey: providerApiKeys[defaultProviderId],
    };
  }, [defaultModelId, defaultProviderId, providerApiKeys]);

  const {
    isReady,
    isRunning,
    error,
    roomConfig,
    turnState,
    messages,
    streamingMessage,
    addUserMessage,
    runNextTurn,
    updateRoomConfig,
  } = useRoomSession({
    roomId,
    modelConfig,
  });

  const displayMessages = useMemo(() => {
    if (!streamingMessage) {
      return messages;
    }
    return [...messages, streamingMessage];
  }, [messages, streamingMessage]);

  useEffect(() => {
    if (!autoRunEnabled) {
      return;
    }
    if (!isReady || isRunning) {
      return;
    }

    const timer = window.setTimeout(() => {
      void runNextTurn();
    }, autoRunDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    autoRunDelayMs,
    autoRunEnabled,
    isReady,
    isRunning,
    runNextTurn,
  ]);

  useEffect(() => {
    if (error && autoRunEnabled) {
      setAutoRunEnabled(false);
    }
  }, [autoRunEnabled, error]);

  if (!isReady || !roomConfig) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2Icon className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_38%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.14),transparent_42%)] p-4 md:p-6">
      <RoomStatusBar turnState={turnState} />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-h-0">
          <RoomChatMessageList messages={displayMessages} />
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          <RoomDirectorPanel
            roomConfig={roomConfig}
            onUpdate={updateRoomConfig}
          />
          <RoomCharacterPanel
            roomConfig={roomConfig}
          />
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border/70 bg-background/80 p-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
          <span className="text-sm text-muted-foreground">自动推进</span>
          <Input
            type="number"
            min={200}
            step={100}
            value={autoRunDelayMs}
            onChange={(event) => setAutoRunDelayMs(Math.max(200, Number(event.target.value) || 200))}
            className="h-8 w-28"
          />
          <span className="text-xs text-muted-foreground">ms 间隔</span>
          <Button
            type="button"
            variant={autoRunEnabled ? "secondary" : "outline"}
            onClick={() => {
              setAutoRunEnabled(prev => !prev);
            }}
          >
            {autoRunEnabled ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
            {autoRunEnabled ? "暂停角色对话" : "启动角色对话"}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="输入你的创作要求、异议或方向调整..."
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const text = input;
                setInput("");
                void (async () => {
                  await addUserMessage(text);
                  await runNextTurn();
                })();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const text = input;
              setInput("");
              void (async () => {
                await addUserMessage(text);
                await runNextTurn();
              })();
            }}
            disabled={!input.trim()}
          >
            发送
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
