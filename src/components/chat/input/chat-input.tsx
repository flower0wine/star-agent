"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ChatInputProps {
  /** 输入值 */
  value: string;
  /** 值变更回调 */
  onChange: (value: string) => void;
  /** 提交回调 */
  onSubmit: () => void;
  /** 停止生成回调 */
  onStop?: () => void;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 聊天输入框组件
 * 支持多行输入、快捷键提交、加载状态
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading = false,
  placeholder = "输入消息...",
  disabled = false,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (value.trim() && !isLoading) {
          onSubmit();
        }
      }
    },
    [value, isLoading, onSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleSubmitClick = useCallback(() => {
    if (isLoading) {
      onStop?.();
    } else if (value.trim()) {
      onSubmit();
    }
  }, [isLoading, value, onSubmit, onStop]);

  const canSubmit = value.trim().length > 0 || isLoading;

  return (
    <div className={cn("relative", className)}>
      {/* 聚焦时的发光效果 */}
      <div className="absolute -inset-px rounded-2xl bg-linear-to-r from-primary/20 via-primary/10 to-primary/20 opacity-0 blur transition-opacity duration-300 group-focus-within:opacity-100" />

      {/* 输入框容器 */}
      <div className="group relative rounded-2xl border border-border/60 bg-background/95 backdrop-blur-sm shadow-sm transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/5">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "min-h-[52px] max-h-[200px] w-full resize-none",
            "rounded-2xl border-0 bg-transparent",
            "py-3.5 pl-4 pr-14",
            "text-sm leading-relaxed",
            "placeholder:text-muted-foreground/50",
            "focus-visible:outline-none focus-visible:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        {/* 发送/停止按钮 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          {/* 快捷键提示 */}
          <AnimatePresence>
            {value.trim() && !isLoading && (
              <motion.span
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="hidden sm:block text-[10px] text-muted-foreground/40 select-none"
              >
                Enter ↵
              </motion.span>
            )}
          </AnimatePresence>

          <Button
            type="button"
            size="icon"
            onClick={handleSubmitClick}
            disabled={!canSubmit}
            className={cn(
              "size-8 rounded-xl transition-all duration-200",
              isLoading
                ? "bg-destructive/90 hover:bg-destructive text-destructive-foreground"
                : "bg-primary hover:bg-primary/90 shadow-md shadow-primary/20",
              !canSubmit && "opacity-40 cursor-not-allowed"
            )}
            aria-label={isLoading ? "停止生成" : "发送消息"}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <SquareIcon className="size-3.5 fill-current" />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ArrowUpIcon className="size-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </div>
  );
}
