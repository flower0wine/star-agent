"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2Icon, DownloadIcon } from "lucide-react";
import type { ComponentProps } from "react";

export interface ChatHeaderProps {
  conversationId: string;
  title: string;
  onClearChat: () => void;
  onDownload?: () => void;
}

export function ChatHeader({
  conversationId,
  title,
  onClearChat,
  onDownload,
}: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {onDownload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDownload}
                title="Download conversation"
              >
                <DownloadIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download conversation</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClearChat}
              title="Clear chat"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear chat</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
