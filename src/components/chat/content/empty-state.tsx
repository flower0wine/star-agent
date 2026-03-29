"use client";

import { cn } from "@/lib/utils";
import { BotIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  /** 图标 */
  icon?: ReactNode;
  /** 标题 */
  title: string;
  /** 描述文本 */
  description?: string;
  /** 额外内容 (如建议列表) */
  children?: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * 空状态组件
 * 聊天开始前的欢迎界面
 */
export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        "min-h-[60vh] px-4 py-8",
        className
      )}
    >
      {/* 图标区域 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative mb-6"
      >
        {/* 光晕效果 */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/15 to-secondary/10 rounded-full blur-2xl scale-150" />

        {/* 图标容器 */}
        <div className="relative size-20 rounded-2xl bg-linear-to-br from-primary/10 to-secondary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/5">
          {icon ?? <BotIcon className="size-10 text-primary/60" />}
        </div>
      </motion.div>

      {/* 标题 */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="text-xl font-semibold text-foreground/90 mb-2"
      >
        {title}
      </motion.h2>

      {/* 描述 */}
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-sm text-muted-foreground/70 mb-8 text-center max-w-md"
        >
          {description}
        </motion.p>
      )}

      {/* 额外内容 */}
      {children && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-full"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
