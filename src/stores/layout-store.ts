"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LayoutStore {
  // Sidebar state
  sidebarExpanded: boolean;
  sidebarOpen: boolean; // For mobile (drawer)

  // Actions
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      // Default: expanded on desktop (will be adjusted based on screen size)
      sidebarExpanded: true,
      sidebarOpen: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

      setSidebarExpanded: (expanded: boolean) =>
        set({ sidebarExpanded: expanded }),

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
    }),
    {
      name: "app-layout",
      partialize: (state) => ({
        sidebarExpanded: state.sidebarExpanded,
      }),
    }
  )
);
