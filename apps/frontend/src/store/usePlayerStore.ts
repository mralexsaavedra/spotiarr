import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createPlayerUISlice, type PlayerUISlice } from "./playerUISlice";

export interface QueueItem {
  id: string;
  name: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  audioUrl: string;
  durationMs?: number;
  /**
   * Pre-built absolute route to the surface that queued this track
   * (e.g. `/playlist/abc?mode=library`). When present, GlobalPlayerBar
   * renders track meta as a navigable button. Each controller is responsible
   * for building the canonical path for its own page.
   */
  contextPath?: string;
}

export type RepeatMode = "off" | "all" | "one";

export interface PlayerState extends PlayerUISlice {
  queue: QueueItem[];
  currentIndex: number | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  shuffleMode: boolean;
  repeatMode: RepeatMode;
  shuffleOrder: number[];
  shuffleOrderIndex: number;
  consecutiveErrors: number;
  isBuffering: boolean;

  playQueue: (items: QueueItem[], startIndex: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  clear: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playFromIndex: (index: number) => void;

  reorderQueue: (fromIndex: number, toIndex: number) => void;

  setAudioElement: (el: HTMLAudioElement | null) => void;
  _onLoadedMetadata: (duration: number) => void;
  _onTimeUpdate: (currentTime: number) => void;
  _onEnded: () => void;
  _onError: (message: string) => void;
  _onWaiting: () => void;
  _onCanPlay: () => void;
}

export const __partialize = (
  state: PlayerState,
): Pick<PlayerState, "volume" | "isMuted" | "shuffleMode" | "repeatMode"> => ({
  volume: state.volume,
  isMuted: state.isMuted,
  shuffleMode: state.shuffleMode,
  repeatMode: state.repeatMode,
});

let _audioElement: HTMLAudioElement | null = null;

function shuffleIndices(length: number, pin: number): number[] {
  if (length === 0) return [];
  if (length === 1) return [pin];
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 1; i--) {
    const j = 1 + Math.floor(Math.random() * i);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  const pinPos = arr.indexOf(pin);
  if (pinPos !== 0) {
    const tmp = arr[0]!;
    arr[0] = arr[pinPos]!;
    arr[pinPos] = tmp;
  }
  return arr;
}

const INITIAL_STATE = {
  queue: [] as QueueItem[],
  currentIndex: null as number | null,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  currentTime: 0,
  duration: 0,
  error: null as string | null,
  shuffleMode: false,
  repeatMode: "off" as RepeatMode,
  shuffleOrder: [] as number[],
  shuffleOrderIndex: -1,
  consecutiveErrors: 0,
  isBuffering: false,
};

type AdvanceSource = "user" | "ended" | "error";

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => {
      function advance(source: AdvanceSource): void {
        const { currentIndex, queue, shuffleMode, shuffleOrder, shuffleOrderIndex, repeatMode } =
          get();
        if (currentIndex === null) return;
        if (source === "ended" && repeatMode === "one") {
          if (_audioElement) {
            _audioElement.currentTime = 0;
            void _audioElement.play();
          }
          return;
        }
        if (shuffleMode) {
          if (shuffleOrderIndex >= shuffleOrder.length - 1) {
            if (repeatMode === "all") {
              set({ shuffleOrderIndex: 0, currentIndex: shuffleOrder[0]!, currentTime: 0 });
            } else {
              set({ isPlaying: false });
            }
            return;
          }
          const nextOrderIndex = shuffleOrderIndex + 1;
          set({
            shuffleOrderIndex: nextOrderIndex,
            currentIndex: shuffleOrder[nextOrderIndex]!,
            currentTime: 0,
          });
          return;
        }
        if (currentIndex >= queue.length - 1) {
          if (repeatMode === "all") {
            set({ currentIndex: 0, currentTime: 0 });
          } else {
            set({ isPlaying: false });
          }
          return;
        }
        set({ currentIndex: currentIndex + 1, currentTime: 0 });
      }

      return {
        ...INITIAL_STATE,
        ...createPlayerUISlice(set, get, undefined as never),

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
            consecutiveErrors: 0,
          });
          if (get().shuffleMode && items.length > 0) {
            const order = shuffleIndices(items.length, startIndex);
            set({ shuffleOrder: order, shuffleOrderIndex: 0 });
          } else {
            set({ shuffleOrder: [], shuffleOrderIndex: -1 });
          }
        },

        togglePlay() {
          const { currentIndex, isPlaying } = get();
          if (currentIndex === null) return;
          set({ isPlaying: !isPlaying });
        },

        next() {
          advance("user");
        },

        prev() {
          const {
            currentIndex,
            currentTime,
            shuffleMode,
            shuffleOrder,
            shuffleOrderIndex,
            queue,
            repeatMode,
          } = get();
          if (currentIndex === null) return;
          if (currentTime > 3) {
            set({ currentTime: 0 });
            if (_audioElement) {
              _audioElement.currentTime = 0;
            }
            return;
          }
          if (shuffleMode) {
            if (shuffleOrderIndex > 0) {
              const nextOrderIndex = shuffleOrderIndex - 1;
              set({
                shuffleOrderIndex: nextOrderIndex,
                currentIndex: shuffleOrder[nextOrderIndex]!,
                currentTime: 0,
              });
              return;
            }
            if (repeatMode === "all") {
              const nextOrderIndex = shuffleOrder.length - 1;
              set({
                shuffleOrderIndex: nextOrderIndex,
                currentIndex: shuffleOrder[nextOrderIndex]!,
                currentTime: 0,
              });
            }
            return;
          }
          if (currentIndex > 0) {
            set({ currentIndex: currentIndex - 1, currentTime: 0 });
            return;
          }
          if (repeatMode === "all") {
            set({ currentIndex: queue.length - 1, currentTime: 0 });
          }
        },

        seek(seconds) {
          const { duration } = get();
          const clamped =
            duration > 0 ? Math.max(0, Math.min(seconds, duration)) : Math.max(0, seconds);
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
            isQueuePanelOpen: false,
            isNowPlayingOpen: false,
            isBuffering: false,
          });
        },

        setAudioElement(el) {
          _audioElement = el;
        },

        _onLoadedMetadata(duration) {
          set({
            duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
            consecutiveErrors: 0,
          });
        },

        _onTimeUpdate(currentTime) {
          set({ currentTime });
        },

        _onEnded() {
          advance("ended");
        },

        toggleShuffle() {
          const { shuffleMode, queue, currentIndex } = get();
          if (shuffleMode) {
            set({ shuffleMode: false, shuffleOrder: [], shuffleOrderIndex: -1 });
            return;
          }
          if (currentIndex === null || queue.length === 0) {
            set({ shuffleMode: true, shuffleOrder: [], shuffleOrderIndex: -1 });
            return;
          }
          const order = shuffleIndices(queue.length, currentIndex);
          set({ shuffleMode: true, shuffleOrder: order, shuffleOrderIndex: 0 });
        },

        cycleRepeat() {
          const cycle: Record<RepeatMode, RepeatMode> = { off: "all", all: "one", one: "off" };
          set({ repeatMode: cycle[get().repeatMode] });
        },

        _onError(message) {
          const { currentIndex, queue, consecutiveErrors } = get();
          if (currentIndex === null) {
            set({ error: message, isPlaying: false, isBuffering: false });
            return;
          }
          const errs = consecutiveErrors + 1;
          if (errs >= queue.length) {
            set({ error: message, isPlaying: false, consecutiveErrors: 0, isBuffering: false });
            return;
          }
          set({ consecutiveErrors: errs, error: message, isBuffering: false });
          advance("error");
        },

        _onWaiting() {
          set({ isBuffering: true });
        },

        _onCanPlay() {
          set({ isBuffering: false });
        },

        playFromIndex(index) {
          const { queue, shuffleMode } = get();
          if (index < 0 || index >= queue.length) return;
          set({
            currentIndex: index,
            isPlaying: true,
            currentTime: 0,
            error: null,
            consecutiveErrors: 0,
          });
          if (_audioElement) _audioElement.currentTime = 0;
          if (shuffleMode) {
            const order = shuffleIndices(queue.length, index);
            set({ shuffleOrder: order, shuffleOrderIndex: 0 });
          }
        },

        reorderQueue(fromIndex, toIndex) {
          const { queue, currentIndex, shuffleMode } = get();
          const len = queue.length;

          if (fromIndex === toIndex) return;
          if (fromIndex < 0 || fromIndex >= len) return;
          if (toIndex < 0 || toIndex >= len) return;

          const nextQueue = queue.slice();
          const [moved] = nextQueue.splice(fromIndex, 1);
          nextQueue.splice(toIndex, 0, moved!);

          // ADR-1: 4-scenario currentIndex arithmetic
          let nextCurrentIndex = currentIndex;
          if (currentIndex !== null) {
            if (fromIndex === currentIndex) {
              nextCurrentIndex = toIndex; // (1) moved the current track
            } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
              nextCurrentIndex = currentIndex - 1; // (2) before → at/after current
            } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
              nextCurrentIndex = currentIndex + 1; // (3) after → at/before current
            }
            // (4) both on same side → unchanged
          }

          set({ queue: nextQueue, currentIndex: nextCurrentIndex });

          if (shuffleMode && nextCurrentIndex !== null) {
            const order = shuffleIndices(nextQueue.length, nextCurrentIndex);
            set({ shuffleOrder: order, shuffleOrderIndex: 0 });
          }
        },
      };
    },
    {
      name: "spotiarr-player",
      partialize: __partialize,
    },
  ),
);
