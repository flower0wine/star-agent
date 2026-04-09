"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import { ExternalLinkIcon, LoaderIcon } from "lucide-react";
import type { DynamicToolUIPart, ToolUIPart } from "ai";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { PatentItem, SearchPatentsOutput } from "./types";
import { Button } from "@/components/ui/button";

interface SearchPatentsToolPartProps {
  part: ToolUIPart | DynamicToolUIPart;
  itemKey: string;
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }
  return parsed.format("YYYY-MM-DD");
}

function isSafeExternalUrl(url?: string): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatPeople(input?: Array<{ name?: string }>, limit = 2): string {
  if (!input || input.length === 0) {
    return "-";
  }
  const names = input
    .map(item => item.name?.trim() || "")
    .filter(Boolean);
  if (names.length === 0) {
    return "-";
  }
  const shown = names.slice(0, limit).join(", ");
  if (names.length <= limit) {
    return shown;
  }
  return `${shown} +${names.length - limit}`;
}

function renderSummaryBadges(input: Record<string, unknown> | undefined): Array<{ label: string; value: string }> {
  if (!input) {
    return [];
  }

  const items: Array<{ label: string; value: string }> = [];
  if (typeof input.query === "string" && input.query.trim()) {
    items.push({ label: "Query", value: input.query.trim() });
  }
  if (typeof input.company === "string" && input.company.trim()) {
    items.push({ label: "Company", value: input.company.trim() });
  }
  if (typeof input.sortBy === "string" && input.sortBy.trim()) {
    items.push({ label: "Sort", value: input.sortBy.trim() });
  }
  if (typeof input.sortOrder === "string" && input.sortOrder.trim()) {
    items.push({ label: "Order", value: input.sortOrder.trim() });
  }
  if (typeof input.limit === "number" && Number.isFinite(input.limit)) {
    items.push({ label: "Limit", value: String(input.limit) });
  }
  return items;
}

function PatentResultCard({ patent }: { patent: PatentItem }) {
  const canOpenLink = isSafeExternalUrl(patent.sourceUrl);
  const titleText = patent.title?.trim() || "(无标题)";
  const abstractText = patent.abstract?.trim();

  return (
    <Card className="rounded-lg border border-border/80 bg-background/70">
      <CardHeader className="space-y-2 px-4 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <CardTitle className="line-clamp-2 cursor-help text-sm font-medium">
                {titleText}
              </CardTitle>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="max-w-md whitespace-pre-wrap break-words">
              {titleText}
            </TooltipContent>
          </Tooltip>
          {canOpenLink && (
            <Button variant="outline" size="sm" asChild>
              <a href={patent.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon className="size-3.5" />
                打开
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-0 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">#{patent.patentId || "-"}</Badge>
          <Badge variant="outline" className="rounded-full">公开日: {formatDate(patent.patentDate)}</Badge>
          <Badge variant="outline" className="rounded-full">申请日: {formatDate(patent.applicationDate)}</Badge>
        </div>
        <div>
          <span className="font-medium text-foreground/90">Assignees:</span> {formatPeople(patent.assignees)}
        </div>
        <div>
          <span className="font-medium text-foreground/90">Inventors:</span> {formatPeople(patent.inventors)}
        </div>
        {abstractText && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="line-clamp-3 cursor-help leading-relaxed">
                {abstractText}
              </p>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="max-w-md whitespace-pre-wrap break-words">
              {abstractText}
            </TooltipContent>
          </Tooltip>
        )}
      </CardContent>
    </Card>
  );
}

export function SearchPatentsToolPart({ part, itemKey }: SearchPatentsToolPartProps) {
  if (part.state === "input-streaming") {
    return (
      <div key={itemKey} className="flex items-center gap-2 text-muted-foreground text-sm">
        <LoaderIcon className="size-4 animate-spin" />
        正在检索专利...
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div key={itemKey} className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        检索失败: {part.errorText}
      </div>
    );
  }

  if (part.state !== "output-available") {
    return null;
  }

  const output = (part.output || {}) as SearchPatentsOutput;
  const patents = output.patents || [];
  const inputBadges = renderSummaryBadges((part.input || undefined) as Record<string, unknown> | undefined);

  const hitText = useMemo(() => {
    const count = typeof output.count === "number" ? output.count : patents.length;
    const totalHits = typeof output.totalHits === "number" ? output.totalHits : patents.length;
    return `${count} / ${totalHits}`;
  }, [output.count, output.totalHits, patents.length]);

  return (
    <TooltipProvider delayDuration={200}>
      <div key={itemKey} className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            Provider: {output.provider || "-"}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Hits: {hitText}
          </Badge>
          <Badge variant="outline" className="rounded-full">
            Time: {formatDate(output.timeRange?.fromDate)} ~ {formatDate(output.timeRange?.toDate)}
          </Badge>
        </div>

        {inputBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {inputBadges.map(item => (
              <Badge key={`${item.label}-${item.value}`} variant="secondary" className="rounded-full">
                {item.label}: {item.value}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {patents.length === 0
          ? (
              <div className="rounded-lg border border-dashed border-border/80 px-3 py-5 text-center text-muted-foreground text-sm">
                未检索到专利数据
              </div>
            )
          : (
              <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
                {patents.map((patent, index) => (
                  <PatentResultCard key={`${patent.patentId || "patent"}-${index}`} patent={patent} />
                ))}
                {patents.length > 0 && (
                  <div className="text-center text-muted-foreground text-xs">
                    Showing {patents.length} results
                  </div>
                )}
              </div>
            )}
      </div>
    </TooltipProvider>
  );
}
