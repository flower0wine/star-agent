"use client";

import { useEffect } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { MessageSquareIcon, MoreHorizontalIcon, PencilIcon, TrashIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

dayjs.extend(relativeTime);
dayjs.locale("zh-cn");

interface ConversationListProps {
  onSelect?: (conversationId: string) => void;
  onRename?: (conversationId: string, currentTitle: string) => void;
}

export function ConversationList({ onSelect, onRename }: ConversationListProps) {
  const {
    conversations,
    currentConversationId,
    isLoading,
    isInitialized,
    initialize,
    selectConversation,
    deleteConversationById,
  } = useChatHistoryStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSelect = (id: string) => {
    selectConversation(id);
    onSelect?.(id);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversationById(id);
  };

  const handleRename = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRename?.(id, title);
  };

  if (!isInitialized || isLoading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>对话历史</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {Array.from({ length: 3 }).map((_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (conversations.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>对话历史</SidebarGroupLabel>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            暂无对话历史
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Group conversations by date
  const today = dayjs().startOf("day");
  const yesterday = today.subtract(1, "day");
  const lastWeek = today.subtract(7, "day");

  const groups = {
    today: [] as typeof conversations,
    yesterday: [] as typeof conversations,
    lastWeek: [] as typeof conversations,
    older: [] as typeof conversations,
  };

  conversations.forEach((conv) => {
    const convDate = dayjs(conv.updatedAt);
    if (convDate.isAfter(today)) {
      groups.today.push(conv);
    } else if (convDate.isAfter(yesterday)) {
      groups.yesterday.push(conv);
    } else if (convDate.isAfter(lastWeek)) {
      groups.lastWeek.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  const renderGroup = (label: string, items: typeof conversations) => {
    if (items.length === 0)
      return null;

    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((conv) => (
              <SidebarMenuItem key={conv.id}>
                <SidebarMenuButton
                  onClick={() => handleSelect(conv.id)}
                  isActive={currentConversationId === conv.id}
                  tooltip={conv.title}
                >
                  <MessageSquareIcon className="size-4" />
                  <span className="truncate">{conv.title}</span>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction
                      className={cn(
                        "opacity-0 group-hover/menu-item:opacity-100",
                        "data-[state=open]:opacity-100"
                      )}
                    >
                      <MoreHorizontalIcon className="size-4" />
                      <span className="sr-only">更多操作</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem
                      onClick={(e) => handleRename(conv.id, conv.title, e)}
                    >
                      <PencilIcon className="mr-2 size-4" />
                      重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => void handleDelete(conv.id, e)}
                      className="text-destructive focus:text-destructive"
                    >
                      <TrashIcon className="mr-2 size-4" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <>
      {renderGroup("今天", groups.today)}
      {renderGroup("昨天", groups.yesterday)}
      {renderGroup("最近 7 天", groups.lastWeek)}
      {renderGroup("更早", groups.older)}
    </>
  );
}
