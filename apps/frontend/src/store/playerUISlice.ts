import type { StateCreator } from "zustand";

export interface PlayerUISlice {
  isQueuePanelOpen: boolean;
  isNowPlayingOpen: boolean;
  setQueuePanelOpen: (open: boolean) => void;
  setNowPlayingOpen: (open: boolean) => void;
}

export const createPlayerUISlice: StateCreator<
  PlayerUISlice,
  [["zustand/persist", unknown]],
  [],
  PlayerUISlice
> = (set) => ({
  isQueuePanelOpen: false,
  isNowPlayingOpen: false,
  setQueuePanelOpen: (open) => set({ isQueuePanelOpen: open }),
  setNowPlayingOpen: (open) => set({ isNowPlayingOpen: open }),
});
