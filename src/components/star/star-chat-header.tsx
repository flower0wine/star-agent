"use client";

import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import { motion } from "motion/react";

export interface StarChatHeaderProps {
  username: string;
  messageCount: number;
  status?: "ready" | "chatting";
  onLogout: () => void;
}

export function StarChatHeader({
  username,
  messageCount,
  status = "ready",
  onLogout,
}: StarChatHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex size-9 items-center justify-center rounded-full bg-primary/10"
          >
            <StarIcon className="size-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="font-semibold">Star Agent</h1>
            <p className="text-xs text-muted-foreground">
              @{username} · {messageCount > 0 ? "Chatting" : "Ready"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Change User
        </Button>
      </div>
    </header>
  );
}
