import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Star Agent Workspace</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          打开独立 Demo 页面，查看 Vercel AI SDK 的流式输出、工具调用和执行过程 UI 展示。
        </p>
      </div>
      <div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/demo/vercel-ai-sdk">打开 Vercel AI SDK Demo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/room">进入多 Agent 聊天室</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
