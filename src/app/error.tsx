"use client";

import { ErrorStateScreen } from "@/components/app/status/error-state-screen";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: GlobalErrorPageProps) {
  const message = error.message?.trim() || "系统未返回详细错误信息。";

  return (
    <ErrorStateScreen
      title="应用发生异常"
      description={`错误信息：${message}`}
      onRetry={reset}
    />
  );
}
