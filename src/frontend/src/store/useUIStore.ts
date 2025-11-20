import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  collapsedPlaylists: Set<number>;
  togglePlaylistCollapse: (id: number) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isDarkMode: true,
      toggleDarkMode: () =>
        set((state) => {
          const newMode = !state.isDarkMode;
          if (newMode) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
          return { isDarkMode: newMode };
        }),
      collapsedPlaylists: new Set(),
      togglePlaylistCollapse: (id) =>
        set((state) => {
          const newSet = new Set(state.collapsedPlaylists);
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
          return { collapsedPlaylists: newSet };
        }),
    }),
    {
      name: 'spotiarr-ui',
      partialize: (state) => ({ isDarkMode: state.isDarkMode }),
    },
  ),
);
