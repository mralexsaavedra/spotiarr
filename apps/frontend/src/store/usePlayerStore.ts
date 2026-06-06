/**
 * 3rd Zustand store — approved exception to the "exactly 2 stores" convention.
 * Singleton module survives client-side navigation so playback continues across
 * route changes; selector subscriptions confine ~4Hz currentTime re-renders to
 * the progress sub-component. See `sdd/global-player-bar/proposal`.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QueueItem {
  id: string;
  name: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  audioUrl: string;
  durationMs?: number;
}

export interface PlayerState {
  queue: QueueItem[];
  currentIndex: number | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  error: string | null;

  playQueue: (items: QueueItem[], startIndex: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  clear: () => void;

  setAudioElement: (el: HTMLAudioElement | null) => void;
  _onLoadedMetadata: (duration: number) => void;
  _onTimeUpdate: (currentTime: number) => void;
  _onEnded: () => void;
  _onError: (message: string) => void;
}

export const __partialize = (state: PlayerState): Pick<PlayerState, "volume" | "isMuted"> => ({
  volume: state.volume,
  isMuted: state.isMuted,
});

let _audioElement: HTMLAudioElement | null = null;

const INITIAL_STATE = {
  queue: [] as QueueItem[],
  currentIndex: null as number | null,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  currentTime: 0,
  duration: 0,
  error: null as string | null,
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      playQueue(items, startIndex) {
        if (items.length === 0 || startIndex < 0 || startIndex >= items.length) {
          get().clear();
          return;
        }
        set({
          queue: items,
          currentIndex: startIndex,
          isPlaying: true,
          currentTime: 0,
          error: null,
        });
      },

      togglePlay() {
        const { currentIndex, isPlaying } = get();
        if (currentIndex === null) return;
        set({ isPlaying: !isPlaying });
      },

      next() {
        const { currentIndex, queue } = get();
        if (currentIndex === null) return;
        if (currentIndex >= queue.length - 1) {
          set({ isPlaying: false });
          return;
        }
        set({ currentIndex: currentIndex + 1, currentTime: 0 });
      },

      prev() {
        const { currentIndex, currentTime } = get();
        if (currentIndex === null) return;
        if (currentTime > 3) {
          set({ currentTime: 0 });
          if (_audioElement) {
            _audioElement.currentTime = 0;
          }
          return;
        }
        if (currentIndex === 0) return;
        set({ currentIndex: currentIndex - 1, currentTime: 0 });
      },

      seek(seconds) {
        const { duration } = get();
        const clamped = Math.max(0, Math.min(seconds, duration));
        set({ currentTime: clamped });
        if (_audioElement) {
          _audioElement.currentTime = clamped;
        }
      },

      setVolume(v) {
        const clamped = Math.max(0, Math.min(1, v));
        set({ volume: clamped });
        if (_audioElement) {
          _audioElement.volume = clamped;
        }
      },

      toggleMute() {
        const { isMuted } = get();
        const next = !isMuted;
        set({ isMuted: next });
        if (_audioElement) {
          _audioElement.muted = next;
        }
      },

      clear() {
        set({
          queue: [],
          currentIndex: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
          error: null,
        });
      },

      setAudioElement(el) {
        _audioElement = el;
      },

      _onLoadedMetadata(duration) {
        set({ duration });
      },

      _onTimeUpdate(currentTime) {
        set({ currentTime });
      },

      _onEnded() {
        const { currentIndex, queue } = get();
        if (currentIndex === null) return;
        if (currentIndex >= queue.length - 1) {
          set({ isPlaying: false });
          return;
        }
        set({ currentIndex: currentIndex + 1, currentTime: 0 });
      },

      _onError(message) {
        set({ error: message, isPlaying: false });
      },
    }),
    {
      name: "spotiarr-player",
      partialize: __partialize,
    },
  ),
);
