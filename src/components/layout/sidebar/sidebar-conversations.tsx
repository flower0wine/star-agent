"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SidebarConversationItem } from "./sidebar-conversation-item";
import { useConversationStore } from "@/stores/conversation-store";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { History, MessageSquareText, Plus } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
}

// Mock data - will be replaced with real data from storage
const mockConversations: Conversation[] = [];

interface SidebarConversationsProps {
  isExpanded: boolean;
}

export function SidebarConversations({ isExpanded }: SidebarConversationsProps) {
  const router = useRouter();
  const conversations = useConversationStore((state) => state.conversations);
  const createConversation = useConversationStore((state) => state.createConversation);
  const { setSidebarExpanded } = useLayout();

  const handleNewChat = async () => {
    try {
      const conversation = await createConversation();
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  const handleShowConversations = () => {
    setSidebarExpanded(true);
  };

  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {/* New Chat Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              isExpanded ? "w-full justify-start gap-2 px-3" : "size-9 justify-center"
            )}
            onClick={handleNewChat}
            size="icon"
            variant={isExpanded ? "outline" : "ghost"}
          >
            <Plus className="size-4 shrink-0" />
            {isExpanded && <span>New Chat</span>}
          </Button>
        </TooltipTrigger>
        {!isExpanded && <TooltipContent side="right">New Chat</TooltipContent>}
      </Tooltip>

      {/* Show history icon when collapsed */}
      {!isExpanded && conversations.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-9 justify-center"
              onClick={handleShowConversations}
              size="icon"
              variant="ghost"
            >
              <History className="size-4 shrink-0" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">History</TooltipContent>
        </Tooltip>
      )}

      {/* Conversations List - only show when expanded */}
      {isExpanded && conversations.length > 0 && (
        <div className="flex flex-col w-full gap-1">
          <span className="px-3 py-2 text-xs font-medium text-muted-foreground">
            Conversations
          </span>
          {conversations.map((conversation) => (
            <SidebarConversationItem
              conversation={{
                id: conversation.id,
                title: conversation.title,
                lastMessage: conversation.lastMessage,
                updatedAt: new Date(conversation.updatedAt),
              }}
              isExpanded={isExpanded}
              key={conversation.id}
            />
          ))}
        </div>
      )}

      {/* Empty state when no conversations */}
      {isExpanded && conversations.length === 0 && (
        <div className="px-3 py-8 text-center text-sm text-muted-foreground">
          No conversations yet
        </div>
      )}
    </div>
  );
}
