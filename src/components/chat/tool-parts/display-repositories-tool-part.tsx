"use client";

import { LoaderIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";

import { GitHubRepo } from "@/components/agents/star/github-repo";
import type { DisplayRepositoriesOutput } from "./types";

interface DisplayRepositoriesToolPartProps {
  part: ToolUIPart | DynamicToolUIPart;
  itemKey: string;
}

function formatDuration(durationMs?: number): string | null {
  if (durationMs === undefined) {
    return null;
  }
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function DisplayRepositoriesToolPart({ part, itemKey }: DisplayRepositoriesToolPartProps) {
  if (part.state === "input-streaming") {
    return (
      <div key={itemKey} className="flex items-center gap-2 text-muted-foreground text-sm">
        <LoaderIcon className="size-4 animate-spin" />
        Preparing repositories...
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div key={itemKey} className="text-destructive text-sm">
        Error: {part.errorText}
      </div>
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  const data = part.output as DisplayRepositoriesOutput;
  if (!data) {
    return null;
  }

  if (data.state === "loading") {
    return (
      <div key={itemKey} className="flex items-center gap-2 text-muted-foreground">
        <LoaderIcon className="size-4 animate-spin" />
        <span className="text-sm">{data.message || "Loading repositories..."}</span>
      </div>
    );
  }

  if (!data.repos || data.repos.length === 0) {
    return null;
  }

  const durationLabel = formatDuration(data.__duration);

  return (
    <div key={itemKey} className="space-y-3">
      {data.state === "partial" && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <LoaderIcon className="size-3 animate-spin" />
          <span>{data.message || "Loading repositories..."}</span>
        </div>
      )}
      {data.state === "complete" && (
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <span>{data.message || "Repositories loaded"}</span>
          {durationLabel && (
            <span className="text-xs">{durationLabel}</span>
          )}
        </div>
      )}
      <div className="max-h-150 overflow-auto">
        <div className="space-y-3">
          {data.repos.map(repo => (
            <GitHubRepo key={repo.id} repo={repo} />
          ))}
        </div>
      </div>
    </div>
  );
}
