import { SparklesIcon } from "lucide-react";

import { SettingsSectionShell } from "../settings-section-shell";

export function AboutSettingsSection() {
  return (
    <SettingsSectionShell title="关于" description="应用信息和技术栈说明。">
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <SparklesIcon className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Star Agent</div>
              <div className="text-xs text-muted-foreground">v0.1.0</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            智能 GitHub Star 仓库助手，帮助你从收藏仓库中快速定位目标项目。
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">技术栈</span>
            <span>Next.js + React + Tailwind CSS</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">AI 框架</span>
            <span>Vercel AI SDK</span>
          </div>
        </div>
      </div>
    </SettingsSectionShell>
  );
}
