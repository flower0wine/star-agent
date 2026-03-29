"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GithubIcon, Loader2Icon, ArrowRightIcon, AlertCircleIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface StarLoginProps {
  onSubmit: (username: string) => Promise<void>;
  error?: string | null;
  isLoading?: boolean;
}

/**
 * Star Agent 登录页面
 * 用于输入 GitHub 用户名以获取 Star 仓库
 */
export function StarLogin({ onSubmit, error, isLoading }: StarLoginProps) {
  const [username, setUsername] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username.trim() || isLoading)
        return;
      await onSubmit(username.trim());
    },
    [username, isLoading, onSubmit]
  );

  const canSubmit = username.trim().length > 0 && !isLoading;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md px-4">
      {/* Logo 和标题区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center mb-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 200 }}
          className="relative mx-auto mb-6"
        >
          {/* 光晕背景 */}
          <div className="absolute inset-0 size-24 mx-auto rounded-full bg-linear-to-br from-primary/20 to-secondary/10 blur-2xl" />

          {/* 图标容器 */}
          <div className="relative mx-auto size-20 rounded-2xl bg-linear-to-br from-foreground to-foreground/80 flex items-center justify-center shadow-2xl shadow-foreground/10">
            <GithubIcon className="size-10 text-background" />
          </div>
        </motion.div>

        {/* 标题 */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-3xl font-bold tracking-tight mb-3"
        >
          Star Agent
        </motion.h1>

        {/* 描述 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto"
        >
          通过 AI 智能搜索和管理你的 GitHub Star 仓库
        </motion.p>
      </motion.div>

      {/* 表单区域 */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        onSubmit={handleSubmit}
        className="w-full space-y-4"
      >
        {/* 输入框容器 */}
        <div className="relative">
          {/* 聚焦光效 */}
          <div
            className={cn(
              "absolute -inset-px rounded-xl bg-linear-to-r from-primary/30 via-primary/20 to-primary/30 blur transition-opacity duration-300",
              isFocused ? "opacity-100" : "opacity-0"
            )}
          />

          {/* 输入框 */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              <GithubIcon className="size-5" />
            </div>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="输入你的 GitHub 用户名"
              disabled={isLoading}
              className={cn(
                "h-14 pl-12 pr-4 text-base",
                "rounded-xl border-border/60",
                "bg-background/80 backdrop-blur-sm",
                "placeholder:text-muted-foreground/50",
                "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <AlertCircleIcon className="size-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 提交按钮 */}
        <Button
          type="submit"
          size="lg"
          disabled={!canSubmit}
          className={cn(
            "w-full h-12 rounded-xl text-base font-medium",
            "bg-foreground text-background hover:bg-foreground/90",
            "shadow-lg shadow-foreground/10",
            "transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2Icon className="size-5 animate-spin" />
                <span>获取仓库中...</span>
              </motion.span>
            ) : (
              <motion.span
                key="submit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <span>开始使用</span>
                <ArrowRightIcon className="size-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.form>

      {/* 底部提示 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-8 text-center text-xs text-muted-foreground/50"
      >
        AI 可能会犯错，请核实重要信息
      </motion.p>
    </div>
  );
}
