"use client";

import Link from "next/link";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateScreenProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorStateScreen({
  title = "页面加载遇到问题",
  description = "应用在渲染过程中发生了异常。你可以重试，或返回对话页继续操作。",
  onRetry,
}: ErrorStateScreenProps) {
  return (
    <main className="relative flex h-svh w-full items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-12 left-12 h-56 w-56 rounded-full bg-destructive/15 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
      </div>

      <section className="relative w-full max-w-2xl rounded-3xl border bg-card/85 p-5 backdrop-blur-sm sm:p-8">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-2xl border bg-destructive/10 p-2.5">
            <AlertTriangleIcon className="size-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border bg-background/75 p-3 text-xs text-muted-foreground sm:grid-cols-3 sm:text-sm">
          <div className="rounded-xl bg-muted/45 px-3 py-2">建议先点击“重新尝试”</div>
          <div className="rounded-xl bg-muted/45 px-3 py-2">若仍失败，可返回对话页</div>
          <div className="rounded-xl bg-muted/45 px-3 py-2">稍后可在设置页继续排查</div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={onRetry} className="gap-2" disabled={!onRetry}>
            <RotateCcwIcon className="size-4" />
            重新尝试
          </Button>
          <Button asChild variant="secondary">
            <Link href="/chat">返回对话页</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
