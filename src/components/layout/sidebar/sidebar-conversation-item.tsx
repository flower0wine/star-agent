"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Trash2Icon } from "lucide-react";
import { useConversationStore } from "@/stores/conversation-store";

dayjs.extend(relativeTime);

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
}

interface SidebarConversationItemProps {
  conversation: Conversation;
  isExpanded: boolean;
}

export function SidebarConversationItem({
  conversation,
  isExpanded,
}: SidebarConversationItemProps) {
  const router = useRouter();
  const deleteConversation = useConversationStore((state) => state.deleteConversation);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(conversation.id);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const handleClick = () => {
    router.push(`/chat/${conversation.id}`);
  };

  const content = (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2",
        "transition-colors hover:bg-sidebar-accent",
        isExpanded ? "justify-start" : "justify-center"
      )}
      onClick={handleClick}
    >
      {isExpanded ? (
        <>
          <div className="flex-1 overflow-hidden">
            <div className="truncate text-sm font-medium text-sidebar-foreground">
              {conversation.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {conversation.lastMessage}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {dayjs(conversation.updatedAt).fromNow()}
            </div>
          </div>
          <Button
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={handleDelete}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2Icon className="size-3" />
          </Button>
        </>
      ) : (
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent">
          <span className="text-xs font-medium">
            {conversation.title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );

  if (isExpanded) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{conversation.title}</TooltipContent>
    </Tooltip>
  );
}
