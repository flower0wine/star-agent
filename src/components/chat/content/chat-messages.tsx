"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

export interface ChatMessagesProps {
  /** 消息列表 (渲染后的消息组件) */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 聊天消息列表容器
 * 提供动画和布局
 */
export function ChatMessages({ children, className }: ChatMessagesProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

export interface ChatMessageWrapperProps {
  /** 消息 ID */
  id: string;
  /** 是否为最后一条消息 */
  isLast?: boolean;
  /** 消息内容 */
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 单条消息的动画包装器
 */
export function ChatMessageWrapper({
  id,
  isLast = false,
  children,
  className,
}: ChatMessageWrapperProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: "easeOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
