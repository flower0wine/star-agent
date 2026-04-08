import { LoaderCircleIcon, SparklesIcon } from "lucide-react";

export function LoadingStateScreen() {
  return (
    <main className="relative flex h-svh w-full items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-8 bottom-10 h-44 w-44 rounded-full bg-chart-2/20 blur-3xl" />
        <div className="absolute left-8 bottom-8 h-52 w-52 rounded-full bg-chart-1/15 blur-3xl" />
      </div>

      <section className="relative grid w-full max-w-3xl gap-4 rounded-3xl border bg-card/80 p-5 backdrop-blur-sm sm:grid-cols-[1.2fr_1fr] sm:p-7">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
            <SparklesIcon className="size-3.5 text-primary" />
            Star Agent Workspace
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">正在构建你的工作上下文</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            正在准备对话状态、工具配置与界面资源。通常只需要几秒。
          </p>
        </div>

        <div className="rounded-2xl border bg-background/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin text-primary" />
            加载进度
          </div>
          <div className="space-y-2">
            {["准备布局容器", "恢复会话快照", "同步设置状态"].map((label, index) => (
              <div
                key={label}
                className="h-2.5 w-full rounded-full bg-muted/70"
              >
                <div
                  className="h-full rounded-full bg-primary/60 animate-pulse"
                  style={{
                    width: `${68 + index * 10}%`,
                    animationDelay: `${index * 150}ms`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
