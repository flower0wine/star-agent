"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/main-layout";
import { Sidebar } from "@/components/layout/sidebar/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { useConversationStore } from "@/stores/conversation-store";
import { SparklesIcon } from "lucide-react";
import { LoginButton } from "@/components/auth/login-button";

export default function Home() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useConversationStore((state) => state.isHydrated);
  const createConversation = useConversationStore((state) => state.createConversation);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async () => {
    if (!isAuthenticated)
      return;

    setIsLoading(true);
    try {
      const conversation = await createConversation();
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (!isHydrated) {
    return (
      <TooltipProvider delayDuration={0}>
        <MainLayout sidebar={<Sidebar />}>
          <div className="flex h-full items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </MainLayout>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <MainLayout sidebar={<Sidebar />}>
        <div className="flex h-full flex-col items-center justify-center">
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-secondary p-4">
                <SparklesIcon className="size-10 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome to Star Finder
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isAuthenticated
                ? "Find repositories from your GitHub stars"
                : "Sign in with GitHub to get started"}
            </p>

            {!isAuthenticated && (
              <LoginButton className="mt-6" />
            )}

            {isAuthenticated && (
              <Button
                className="mt-6"
                onClick={handleStartChat}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Start New Chat"}
              </Button>
            )}
          </div>
        </div>
      </MainLayout>
    </TooltipProvider>
  );
}
