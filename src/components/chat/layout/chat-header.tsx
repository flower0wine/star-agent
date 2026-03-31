"use client";

import { LogOutIcon, RefreshCwIcon } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ChatHeaderProps {
  /** 左侧内容插槽 (如 Agent 选择器) */
  leftSlot?: ReactNode;
  /** 右侧自定义插槽（如模型选择器） */
  rightSlot?: ReactNode;
  /** 用户名 (可选显示) */
  username?: string;
  /** 是否显示登出按钮 */
  showLogout?: boolean;
  /** 登出回调 */
  onLogout?: () => void;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 是否正在刷新 */
  isRefreshing?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 上次刷新时间提示 */
  refreshTooltip?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 聊天页面顶部导航栏
 * 包含 Agent 选择、用户状态和操作按钮
 */
export function ChatHeader({
  leftSlot,
  rightSlot,
  username,
  showLogout,
  onLogout,
  showRefresh,
  isRefreshing,
  onRefresh,
  refreshTooltip,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 shrink-0",
        "border-b border-border/40",
        "bg-background/80 backdrop-blur-xl backdrop-saturate-150",
        "px-4 py-3",
        className
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        {/* 左侧区域 */}
        <div className="flex min-w-0 items-center gap-4">
          {leftSlot}

          {/* 用户状态徽章 */}
          {username && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-foreground/80">
                @{username}
              </span>
            </motion.div>
          )}
        </div>

        {/* 右侧操作区 */}
        <div className="flex shrink-0 items-center gap-2">
          {rightSlot}

          {/* 刷新按钮 */}
          {showRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCwIcon
                    className={cn("size-4", isRefreshing && "animate-spin")}
                  />
                  <span className="hidden sm:inline">
                    {isRefreshing ? "刷新中..." : "刷新仓库"}
                  </span>
                </Button>
              </TooltipTrigger>
              {refreshTooltip && (
                <TooltipContent>
                  <p>{refreshTooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* 登出按钮 */}
          {showLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-colors"
            >
              <LogOutIcon className="size-4" />
              <span className="hidden sm:inline">退出登录</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
