"use client";

import { cn } from "@/lib/utils";

export interface ChatBackgroundProps {
  className?: string;
}

/**
 * 装饰性背景组件
 * 提供微妙的渐变和光晕效果，增强视觉层次
 */
export function ChatBackground({ className }: ChatBackgroundProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {/* 主渐变光晕 - 右上角 */}
      <div className="absolute -top-1/4 -right-1/4 size-[600px] rounded-full bg-gradient-to-br from-primary/8 via-primary/4 to-transparent blur-3xl" />

      {/* 次要渐变光晕 - 左下角 */}
      <div className="absolute -bottom-1/4 -left-1/4 size-[500px] rounded-full bg-gradient-to-tr from-secondary/6 via-secondary/3 to-transparent blur-3xl" />

      {/* 中央微光效果 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-gradient-radial from-accent/3 to-transparent blur-3xl opacity-50" />
    </div>
  );
}
