"use client";

import { memo } from "react";
import type { SubAgentCard } from "@/types/agent";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircleIcon,
  CircleIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function getSubAgentStatusLabel(status: SubAgentCard["status"]): string {
  switch (status) {
    case "running":
      return "运行中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return "等待中";
  }
}

export const SubAgentStatusIcon = memo(({
  status,
  className,
}: {
  status: SubAgentCard["status"];
  className?: string;
}) => {
  if (status === "running") {
    return <Loader2Icon className={cn("size-4 animate-spin text-primary", className)} />;
  }
  if (status === "completed") {
    return <CheckCircleIcon className={cn("size-4 text-primary", className)} />;
  }
  if (status === "failed") {
    return <XCircleIcon className={cn("size-4 text-destructive", className)} />;
  }
  return <CircleIcon className={cn("size-4 text-muted-foreground/70", className)} />;
});

export const SubAgentStatusBadge = memo(({
  status,
}: {
  status: SubAgentCard["status"];
}) => {
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
        {getSubAgentStatusLabel(status)}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
      {getSubAgentStatusLabel(status)}
    </Badge>
  );
});

