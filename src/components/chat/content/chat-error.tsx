"use client";

import { cn } from "@/lib/utils";
import { AlertCircleIcon } from "lucide-react";
import { motion } from "motion/react";

export interface ChatErrorProps {
  /** 错误信息 */
  message: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 聊天错误提示组件
 */
export function ChatError({ message, className }: ChatErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "mx-auto max-w-3xl mt-4",
        "rounded-xl border border-destructive/20",
        "bg-destructive/5 backdrop-blur-sm",
        "p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertCircleIcon className="size-4 text-destructive" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-destructive mb-1">出错了</p>
          <p className="text-sm text-destructive/80 break-words">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}
