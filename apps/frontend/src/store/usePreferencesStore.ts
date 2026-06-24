import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  audioPrefetchCount: number;
  setAudioPrefetchCount: (n: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (isCollapsed: boolean) => set({ isSidebarCollapsed: isCollapsed }),
      audioPrefetchCount: 3,
      setAudioPrefetchCount: (n: number) =>
        set({ audioPrefetchCount: Math.min(10, Math.max(0, n)) }),
    }),
    {
      name: "spotiarr-preferences",
    },
  ),
);
