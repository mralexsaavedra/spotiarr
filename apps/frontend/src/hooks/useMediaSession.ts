import { useEffect } from "react";
import type { QueueItem } from "@/store/usePlayerStore";

export interface MediaSessionActions {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (timeSec: number) => void;
}

function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && navigator.mediaSession != null;
}

export function useMediaSession(
  currentItem: QueueItem | null,
  isPlaying: boolean,
  actions: MediaSessionActions,
): void {
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

  useEffect(() => {
    if (!isMediaSessionSupported()) return;

    if (!currentItem) {
      navigator.mediaSession.playbackState = "none";
    } else {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying, currentItem]);

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
      handlers.forEach(([name]) => {
        try {
          navigator.mediaSession.setActionHandler(name, null);
        } catch {
          // ignore
        }
      });
      navigator.mediaSession.metadata = null;
    };
  }, [actions]);
}
