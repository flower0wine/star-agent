"use client";

import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useEffect } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

export function MainLayout({ children, sidebar }: MainLayoutProps) {
  const { sidebarExpanded, sidebarOpen, setSidebarExpanded, toggleSidebar, setSidebarOpen } = useLayout();

  // Handle responsive behavior - collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarExpanded(false);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarExpanded]);

  // Handle keyboard shortcut (Cmd/Ctrl + \)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{
          width: sidebarExpanded ? 280 : 64,
          x: sidebarOpen ? 0 : 0,
        }}
        className={cn(
          "relative z-40 flex flex-col border-r bg-sidebar",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50",
          !sidebarExpanded && "max-md:w-16",
          sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
        transition={{ duration: 0.25, ease: [0, 0, 0.58, 1] }}
      >
        {sidebar}
      </motion.aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <motion.main
        className={cn(
          "flex flex-1 flex-col overflow-hidden",
          "max-md:ml-0"
        )}
      >
        {children}
      </motion.main>
    </div>
  );
}
