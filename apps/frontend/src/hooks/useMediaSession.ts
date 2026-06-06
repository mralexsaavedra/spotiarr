import { useEffect } from "react";
import type { QueueItem } from "@/store/usePlayerStore";

export interface MediaSessionActions {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  /** Seek to position in seconds from the start of the current track. */
  seek: (timeSec: number) => void;
}

function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && navigator.mediaSession != null;
}

/**
 * Thin imperative bridge between player store state and the browser's
 * Media Session API. No-ops silently when the API is unavailable (e.g. jsdom,
 * older browsers). Three separate effects keep metadata, playback state, and
 * action handlers independently updated.
 *
 * @param currentItem - The currently playing queue item, or null when idle.
 * @param isPlaying   - Whether playback is active.
 * @param actions     - Stable references to store transport actions.
 */
export function useMediaSession(
  currentItem: QueueItem | null,
  isPlaying: boolean,
  actions: MediaSessionActions,
): void {
  // Effect 1: metadata — keyed on currentItem identity
  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    if (!currentItem) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const artwork = currentItem.artworkUrl ? [{ src: currentItem.artworkUrl }] : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentItem.name,
      artist: currentItem.artist,
      album: currentItem.album ?? "",
      artwork,
    });
  }, [currentItem]);

  // Effect 2: playbackState — keyed on isPlaying + currentItem presence
  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    if (!currentItem) {
      navigator.mediaSession.playbackState = "none";
    } else {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying, currentItem]);

  // Effect 3: action handlers — keyed on actions identity; cleanup clears all on unmount
  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => actions.play()],
      ["pause", () => actions.pause()],
      ["previoustrack", () => actions.previous()],
      ["nexttrack", () => actions.next()],
      [
        "seekto",
        (details: MediaSessionActionDetails) => {
          if (details.seekTime != null) {
            actions.seek(details.seekTime);
          }
        },
      ],
    ];

    handlers.forEach(([name, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(name, handler);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn(`[useMediaSession] setActionHandler("${name}") failed:`, e);
        }
      }
    });

    return () => {
      if (!isMediaSessionSupported()) return;
      // Cleanup: clear all handlers and nullify metadata
      handlers.forEach(([name]) => {
        try {
          navigator.mediaSession.setActionHandler(name, null);
        } catch {
          // Silently ignore on cleanup
        }
      });
      navigator.mediaSession.metadata = null;
    };
  }, [actions]);
}
