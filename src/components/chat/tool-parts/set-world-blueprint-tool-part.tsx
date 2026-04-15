"use client";

import { BookOpenTextIcon, LoaderIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { Badge } from "@/components/ui/badge";
import type { SetWorldBlueprintToolInput, SetWorldBlueprintToolOutput } from "./types";

interface SetWorldBlueprintToolPartProps {
  part: ToolUIPart | DynamicToolUIPart;
  itemKey: string;
}

function formatDuration(duration?: number): string | null {
  if (duration === undefined) {
    return null;
  }
  if (duration < 1000) {
    return `${duration}ms`;
  }
  return `${(duration / 1000).toFixed(1)}s`;
}

export function SetWorldBlueprintToolPart({ part, itemKey }: SetWorldBlueprintToolPartProps) {
  if (part.state === "input-streaming") {
    return (
      <div key={itemKey} className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground text-sm">
        <LoaderIcon className="size-4 animate-spin" />
        编剧正在配置世界观蓝图...
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div key={itemKey} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        世界观配置失败: {part.errorText}
      </div>
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  const input = (part.input || {}) as SetWorldBlueprintToolInput;
  const output = (part.output || {}) as SetWorldBlueprintToolOutput;
  const configured = output.status === "configured";
  const duration = formatDuration(output.__duration);

  return (
    <div key={itemKey} className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpenTextIcon className="size-4 text-primary" />
          {configured ? "世界观蓝图已配置" : "世界观蓝图未通过"}
        </div>
        {duration && <span className="text-muted-foreground text-xs">{duration}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={configured ? "default" : "secondary"}>{output.status || "unknown"}</Badge>
      </div>
      <div className="space-y-1 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm">
        <p className="text-muted-foreground">世界观模板：{input.worldPromptTemplate ? "已提交" : "未提交"}</p>
        <p className="text-muted-foreground">主线蓝图：{input.storyOutline ? "已提交" : "未提交"}</p>
        <p className="text-muted-foreground">展示稿：{input.playwrightOutput ? "已提交" : "未提交"}</p>
      </div>
      <p className="text-muted-foreground text-xs">{output.message || "工具执行完成。"}</p>
    </div>
  );
}
