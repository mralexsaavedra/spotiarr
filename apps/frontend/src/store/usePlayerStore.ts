/**
 * usePlayerStore — Global audio playback store.
 *
 * @remarks
 * **3rd Zustand store — Approved Exception**
 *
 * This project conventionally uses exactly 2 Zustand stores
 * (`usePreferencesStore`, `useDownloadStatusStore`). `usePlayerStore` is an
 * explicitly documented exception approved during the SDD design phase
 * (decision record: `sdd/global-player-bar/proposal`).
 *
 * **Rationale:**
 * 1. **Navigation survivability** — the store must survive client-side route
 *    changes so that audio playback continues uninterrupted. React Context
 *    would require a provider above the router, but Zustand modules are
 *    singleton-scoped and never unmount.
 * 2. **Selector-based subscription necessity** — `currentTime` updates at
 *    ~4 Hz during playback. Zustand selectors confine re-renders to only the
 *    progress-bar sub-component; a Context value would re-render every
 *    consumer on every tick.
 * 3. **Bounded scope** — the store is exclusively consumed by
 *    `GlobalPlayerBar` (audio wiring) and page controllers (dispatch only).
 *    No further stores should be added without equivalent justification and
 *    documentation.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueItem {
  id: string;
  name: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  /** Normalized at the dispatch boundary inside each controller. */
  audioUrl: string;
  durationMs?: number;
}

export interface PlayerState {
  // ---- Public state ----
  queue: QueueItem[];
  currentIndex: number | null;
  isPlaying: boolean;
  /** Volume in range [0, 1]. Persisted. */
  volume: number;
  /** Whether the audio is muted. Persisted. Does not change `volume`. */
  isMuted: boolean;
  /** Current playback position in seconds. NOT persisted. */
  currentTime: number;
  /** Total track duration in seconds. NOT persisted. */
  duration: number;
  /** Inline error message shown in the bar; null when clear. NOT persisted. */
  error: string | null;

  // ---- Public actions ----
  playQueue: (items: QueueItem[], startIndex: number) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  clear: () => void;

  // ---- Internal wiring (called by GlobalPlayerBar only) ----
  setAudioElement: (el: HTMLAudioElement | null) => void;
  _onLoadedMetadata: (duration: number) => void;
  _onTimeUpdate: (currentTime: number) => void;
  _onEnded: () => void;
  _onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Partialize helper — exported for testability
// ---------------------------------------------------------------------------

export const __partialize = (state: PlayerState): Pick<PlayerState, "volume" | "isMuted"> => ({
  volume: state.volume,
  isMuted: state.isMuted,
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Reference to the bound HTMLAudioElement. Lives outside Zustand state so
 *  it does not trigger re-renders when the element is set/unset. */
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

      // ---- Actions ----

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
          // Boundary — next is a no-op for the index, but playback stops
          set({ isPlaying: false });
          return;
        }
        // Advance; isPlaying is unchanged (bar's effect calls play/pause accordingly)
        set({ currentIndex: currentIndex + 1, currentTime: 0 });
      },

      prev() {
        const { currentIndex } = get();
        if (currentIndex === null || currentIndex === 0) return;
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
        // volume and isMuted are intentionally preserved
      },

      // ---- Internal wiring ----

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
          // Last track ended — stop playback (next() is a boundary no-op here)
          set({ isPlaying: false });
          return;
        }
        // Advance to next track
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
