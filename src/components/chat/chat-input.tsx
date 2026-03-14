"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { SquareIcon } from "lucide-react";

export interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  onStopGeneration?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  onStopGeneration,
  disabled = false,
  placeholder = "Ask about your repositories...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "streaming">(
    "idle"
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    async (messageData: PromptInputMessage) => {
      const text = messageData.text.trim();
      if (!text || status !== "idle")
        return;

      setStatus("submitting");
      onSendMessage?.(text);
      setMessage("");
      setStatus("idle");
    },
    [onSendMessage, status]
  );

  const handleStop = useCallback(() => {
    setStatus("idle");
    onStopGeneration?.();
  }, [onStopGeneration]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const text = message.trim();
        if (text && status === "idle") {
          handleSubmit({ text, files: [] });
        }
      }
    },
    [message, status, handleSubmit]
  );

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const submitStatus
    = status === "submitting"
      ? "submitted"
      : status === "streaming"
        ? "streaming"
        : undefined;

  return (
    <div className="border-t p-4">
      <PromptInput
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto"
      >
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            disabled={disabled || status !== "idle"}
            aria-label="Chat message input"
          />

          <PromptInputSubmit
            status={submitStatus}
            onStop={status !== "idle" ? handleStop : undefined}
            disabled={!message.trim() || disabled}
            aria-label={status !== "idle" ? "Stop generation" : "Send message"}
          >
            {status !== "idle" ? (
              <SquareIcon className="size-4" />
            ) : undefined}
          </PromptInputSubmit>
        </PromptInputBody>
      </PromptInput>
    </div>
  );
}
