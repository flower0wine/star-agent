"use client";

import { cn } from "@/lib/utils";
import { SparklesIcon } from "lucide-react";
import { motion } from "motion/react";

export interface SuggestionItem {
  /** 建议文本 */
  text: string;
  /** 图标 (可选) */
  icon?: React.ReactNode;
}

export interface SuggestionListProps {
  /** 建议列表 */
  suggestions: SuggestionItem[];
  /** 点击建议回调 */
  onSelect: (text: string) => void;
  /** 标题 */
  title?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 建议问题列表组件
 * 展示可点击的快速问题建议
 */
export function SuggestionList({
  suggestions,
  onSelect,
  title = "试试这些问题",
  className,
}: SuggestionListProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* 标题 */}
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
        {title}
      </p>

      {/* 建议列表 */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            onClick={() => onSelect(suggestion.text)}
            className={cn(
              "group relative overflow-hidden",
              "flex items-start gap-2.5 p-3",
              "rounded-xl border border-border/50",
              "bg-background/50 backdrop-blur-sm",
              "text-left text-sm text-muted-foreground/80",
              "transition-all duration-200",
              "hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
              "hover:shadow-md hover:shadow-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
          >
            {/* 悬停时的光效 */}
            <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* 图标 */}
            <span className="relative shrink-0 mt-0.5">
              {suggestion.icon ?? (
                <SparklesIcon className="size-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
              )}
            </span>

            {/* 文本 */}
            <span className="relative leading-snug">{suggestion.text}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
