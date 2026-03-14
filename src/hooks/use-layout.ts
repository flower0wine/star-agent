"use client";

import { useLayoutStore } from "@/stores/layout-store";

export function useLayout() {
  const {
    sidebarExpanded,
    sidebarOpen,
    toggleSidebar,
    setSidebarExpanded,
    setSidebarOpen,
  } = useLayoutStore();

  return {
    sidebarExpanded,
    sidebarOpen,
    toggleSidebar,
    setSidebarExpanded,
    setSidebarOpen,
  };
}
