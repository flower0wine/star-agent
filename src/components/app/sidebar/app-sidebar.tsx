"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenIcon, PlusIcon, SettingsIcon, StarIcon } from "lucide-react";

import { createRoom } from "@/lib/storage";
import { useChatHistoryStore } from "@/stores/chat-history-store";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { ThemeToggle } from "../theme-toggle";
import { ConversationList } from "./conversation-list";
import { RenameDialog } from "./rename-dialog";

export function AppSidebar() {
  const router = useRouter();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);

  const { selectConversation, renameConversation } = useChatHistoryStore();

  const handleNewConversation = async () => {
    // 清除当前选择，导航到新对话页面
    selectConversation(null);
    router.push("/chat");
  };

  const handleNewRoom = async () => {
    const room = await createRoom();
    router.push(`/room/${room.id}`);
  };

  const handleSelectConversation = (conversationId: string) => {
    // 导航到会话详情页
    router.push(`/chat/${conversationId}`);
  };

  const handleRename = (id: string, title: string) => {
    setRenameTarget({ id, title });
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async (newTitle: string) => {
    if (renameTarget) {
      await renameConversation(renameTarget.id, newTitle);
    }
    setRenameDialogOpen(false);
    setRenameTarget(null);
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <StarIcon className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Star Agent</span>
                    <span className="text-xs text-muted-foreground">智能仓库助手</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* New Conversation Button */}
          <div className="px-2 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleNewConversation}
            >
              <PlusIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">新建对话</span>
            </Button>
          </div>

          <div className="px-2 pb-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void handleNewRoom()}
            >
              <BookOpenIcon className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">新建聊天室</span>
            </Button>
          </div>

          {/* Conversation History */}
          <ConversationList
            onSelect={handleSelectConversation}
            onRename={handleRename}
          />
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem className="flex items-center justify-between">
              <SidebarMenuButton asChild>
                <Link href="/settings">
                  <SettingsIcon className="size-4" />
                  <span>设置</span>
                </Link>
              </SidebarMenuButton>
              <ThemeToggle />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Rename Dialog */}
      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        initialTitle={renameTarget?.title || ""}
        onConfirm={handleRenameConfirm}
      />
    </>
  );
}
