"use client";

import { BotIcon, LoaderIcon, SparklesIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { Badge } from "@/components/ui/badge";
import type { CreateCharacterToolInput, CreateCharacterToolOutput } from "./types";

interface CreateCharacterToolPartProps {
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

export function CreateCharacterToolPart({ part, itemKey }: CreateCharacterToolPartProps) {
  if (part.state === "input-streaming") {
    return (
      <div key={itemKey} className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground text-sm">
        <LoaderIcon className="size-4 animate-spin" />
        编剧正在创建角色...
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div key={itemKey} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        角色创建失败: {part.errorText}
      </div>
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  const input = (part.input || {}) as CreateCharacterToolInput;
  const output = (part.output || {}) as CreateCharacterToolOutput;
  const isCreated = output.status === "created";
  const durationLabel = formatDuration(output.__duration);

  return (
    <div key={itemKey} className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex size-7 items-center justify-center rounded-md border border-border/70 bg-background">
            {isCreated ? <SparklesIcon className="size-4 text-primary" /> : <BotIcon className="size-4 text-muted-foreground" />}
          </span>
          <span className="font-medium">
            {isCreated ? "编剧创建了新角色" : "角色创建未通过"}
          </span>
        </div>
        {durationLabel && <span className="text-muted-foreground text-xs">{durationLabel}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={isCreated ? "default" : "secondary"}>
          {output.status || "unknown"}
        </Badge>
        {output.characterName && <Badge variant="outline">{output.characterName}</Badge>}
        {output.characterId && <Badge variant="outline">{output.characterId}</Badge>}
      </div>

      <div className="rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm">
        <p className="font-medium">角色名称：{input.name || "-"}</p>
        {input.personalityTraits?.length
          ? <p className="mt-1 text-muted-foreground">性格：{input.personalityTraits.join("、")}</p>
          : null}
        {input.coreValues?.length
          ? <p className="mt-1 text-muted-foreground">价值观：{input.coreValues.join("、")}</p>
          : null}
        {input.distinctiveTraits?.length
          ? <p className="mt-1 text-muted-foreground">特点：{input.distinctiveTraits.join("、")}</p>
          : null}
      </div>

      <p className="text-muted-foreground text-xs">
        {output.message || "工具已执行完成。"}
      </p>
    </div>
  );
}

