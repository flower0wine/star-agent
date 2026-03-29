"use client";

import { cn } from "@/lib/utils";
import { ChatBackground } from "./chat-background";
import type { ReactNode } from "react";

export interface ChatLayoutProps {
  /** 页面头部 */
  header?: ReactNode;
  /** 主要内容区域 */
  children: ReactNode;
  /** 底部输入区域 */
  footer?: ReactNode;
  /** 是否显示背景装饰 */
  showBackground?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 聊天页面主布局容器
 * 提供统一的页面结构：Header + Content + Footer
 */
export function ChatLayout({
  header,
  children,
  footer,
  showBackground = true,
  className,
}: ChatLayoutProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col relative overflow-hidden",
        "bg-background",
        className
      )}
    >
      {/* 装饰性背景 */}
      {showBackground && <ChatBackground />}

      {/* 页面头部 */}
      {header}

      {/* 主要内容区域 */}
      <main className="relative z-10 flex flex-1 flex-col min-h-0">
        {children}
      </main>

      {/* 底部输入区域 */}
      {footer}
    </div>
  );
}
