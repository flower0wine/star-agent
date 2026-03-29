"use client";

import { cn } from "@/lib/utils";
import { ChatInput } from "./chat-input";
import type { ChatInputProps } from "./chat-input";

export interface ChatInputAreaProps extends ChatInputProps {
  /** 底部提示文本 */
  hint?: string;
}

/**
 * 聊天输入区域
 * 包含输入框和底部提示的完整输入区域
 */
export function ChatInputArea({
  hint = "AI 可能会犯错，请核实重要信息。",
  className,
  ...inputProps
}: ChatInputAreaProps) {
  return (
    <div
      className={cn(
        "relative z-20 shrink-0",
        "border-t border-border/30",
        "bg-linear-to-t from-background via-background/98 to-background/95",
        "backdrop-blur-sm",
        "px-4 py-4",
        className
      )}
    >
      <div className="mx-auto max-w-3xl space-y-2">
        <ChatInput {...inputProps} />

        {/* 底部提示 */}
        {hint && (
          <p className="text-center text-[10px] text-muted-foreground/40 select-none">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
