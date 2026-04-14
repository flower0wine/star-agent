"use client";

import { CheckCircle2Icon, LoaderIcon, PauseCircleIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { Badge } from "@/components/ui/badge";
import type { StartRoleCycleToolOutput } from "./types";

interface StartRoleCycleToolPartProps {
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

export function StartRoleCycleToolPart({ part, itemKey }: StartRoleCycleToolPartProps) {
  if (part.state === "input-streaming") {
    return (
      <div key={itemKey} className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground text-sm">
        <LoaderIcon className="size-4 animate-spin" />
        编剧正在启动角色轮回...
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div key={itemKey} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        启动失败: {part.errorText}
      </div>
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  const output = (part.output || {}) as StartRoleCycleToolOutput;
  const started = output.status === "started";
  const duration = formatDuration(output.__duration);

  return (
    <div key={itemKey} className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          {started
            ? <CheckCircle2Icon className="size-4 text-primary" />
            : <PauseCircleIcon className="size-4 text-muted-foreground" />}
          {started ? "角色轮回已开启" : "角色轮回未开启"}
        </div>
        {duration && <span className="text-muted-foreground text-xs">{duration}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={started ? "default" : "secondary"}>
          {output.status || "unknown"}
        </Badge>
        {typeof output.cycleNo === "number" && (
          <Badge variant="outline">周期 {output.cycleNo}</Badge>
        )}
        {output.nextPhase && (
          <Badge variant="outline">{output.nextPhase}</Badge>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{output.message || "工具执行完成。"}</p>
    </div>
  );
}

