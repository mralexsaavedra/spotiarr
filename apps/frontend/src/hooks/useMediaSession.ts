import { useEffect } from "react";
import type { QueueItem } from "@/store/usePlayerStore";

export interface MediaSessionActions {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (timeSec: number) => void;
}

const ALL_ACTIONS: MediaSessionAction[] = [
  "play",
  "pause",
  "previoustrack",
  "nexttrack",
  "seekbackward",
  "seekforward",
  "seekto",
];

function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && navigator.mediaSession != null;
}

/**
 * iOS/iPadOS WebKit exposes only two transport slots next to play/pause and
 * fills them with the <audio> element's native ±skip seek controls by default,
 * which wins over prev/next. Explicitly nulling the seek actions (null !=
 * "not registered" on WebKit) frees those slots so previoustrack/nexttrack
 * surface on the lock screen.
 * iPadOS 13+ reports a Macintosh UA, so we also treat touch-capable Macs as iOS.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function applyMetadata(currentItem: QueueItem | null): void {
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
}

function applyActionHandlers(actions: MediaSessionActions): void {
  const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
    ["play", () => actions.play()],
    ["pause", () => actions.pause()],
    ["previoustrack", () => actions.previous()],
    ["nexttrack", () => actions.next()],
  ];

  if (isIOS()) {
    handlers.push(["seekbackward", null], ["seekforward", null], ["seekto", null]);
  } else {
    handlers.push([
      "seekto",
      (details: MediaSessionActionDetails) => {
        if (details.seekTime != null) {
          actions.seek(details.seekTime);
        }
      },
    ]);
  }

  handlers.forEach(([name, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(name, handler);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn(`[useMediaSession] setActionHandler("${name}") failed:`, e);
      }
    }
  });
}

export function useMediaSession(
  currentItem: QueueItem | null,
  isPlaying: boolean,
  actions: MediaSessionActions,
  audioEl: HTMLAudioElement | null = null,
): void {
  useEffect(() => {
    if (!isMediaSessionSupported()) return;
    applyMetadata(currentItem);
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

    applyActionHandlers(actions);

    return () => {
      if (!isMediaSessionSupported()) return;
      ALL_ACTIONS.forEach((name) => {
        try {
          navigator.mediaSession.setActionHandler(name, null);
        } catch {
          // ignore
        }
      });
      navigator.mediaSession.metadata = null;
    };
  }, [actions]);

  // iOS/WebKit clears MediaSession metadata and action handlers when playback
  // starts, so handlers registered before the first play() are lost. Re-apply
  // them on the audio element's "playing" event — it fires after WebKit has set
  // up the Now Playing session, so the handlers stick.
  useEffect(() => {
    if (!isMediaSessionSupported() || !audioEl) return;

    const reapply = (): void => {
      applyMetadata(currentItem);
      applyActionHandlers(actions);
    };

    audioEl.addEventListener("playing", reapply);
    return () => {
      audioEl.removeEventListener("playing", reapply);
    };
  }, [audioEl, currentItem, actions]);
}
