"use client";

import { usePathname } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

import { AppSidebar } from "./sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isSettingsRoute = pathname.startsWith("/settings");

  if (isSettingsRoute) {
    return (
      <div className="h-svh w-full overflow-hidden bg-background">
        <main className="h-full min-h-0 overflow-hidden">
          {children}
        </main>
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex h-full min-h-0 flex-col overflow-hidden">
        {children}
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  );
}
