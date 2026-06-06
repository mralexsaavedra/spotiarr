import {
  faBackwardStep,
  faForwardStep,
  faListUl,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { FC, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMediaSession } from "@/hooks/useMediaSession";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { QueueItem } from "@/store/usePlayerStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { cn } from "@/utils/cn";
import { Image } from "../atoms/Image";
import { NowPlayingFullscreen } from "./NowPlayingFullscreen";
import { QueueSidePanel } from "./QueueSidePanel";

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

const ProgressSection: FC = () => {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="group flex w-full items-center gap-2">
      <span className="text-text-secondary w-8 shrink-0 text-right text-xs tabular-nums">
        {formatSeconds(currentTime)}
      </span>
      <input
        type="range"
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-valuetext={`${formatSeconds(currentTime)} of ${formatSeconds(duration)}`}
        min={0}
        max={duration || 1}
        step={1}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        className={cn(
          "h-1 flex-1 cursor-pointer appearance-none rounded-full",
          "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full",
          "[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0",
          "[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100",
          "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:opacity-0 group-hover:[&::-moz-range-thumb]:opacity-100",
          "group-hover:[background:linear-gradient(to_right,#1ed760_var(--pct),rgba(255,255,255,0.3)_var(--pct))]",
        )}
        style={
          {
            background: `linear-gradient(to right, white ${pct}%, rgba(255,255,255,0.3) ${pct}%)`,
            "--pct": `${pct}%`,
          } as React.CSSProperties
        }
      />
      <span className="text-text-secondary w-8 shrink-0 text-xs tabular-nums">
        {formatSeconds(duration)}
      </span>
    </div>
  );
};

const VolumeSection: FC = () => {
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  return (
    <div className="hidden items-center gap-2 md:flex">
      <button
        type="button"
        aria-label={isMuted ? "Unmute" : "Mute"}
        aria-pressed={isMuted}
        onClick={toggleMute}
        className="text-text-secondary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-full transition-colors"
      >
        <FontAwesomeIcon icon={isMuted ? faVolumeXmark : faVolumeHigh} className="text-sm" />
      </button>
      <input
        type="range"
        role="slider"
        aria-label="Volume"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={volume}
        aria-valuetext={`${Math.round(volume * 100)}%`}
        min={0}
        max={1}
        step={0.05}
        value={isMuted ? 0 : volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="h-1 w-20 cursor-pointer accent-white"
      />
    </div>
  );
};

const TrackMetaContent: FC<{ item: QueueItem }> = ({ item }) => (
  <>
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded shadow-sm">
      <Image src={item.artworkUrl} alt={item.name} className="rounded" />
    </div>
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-semibold text-white">{item.name}</span>
      <span className="text-text-secondary truncate text-xs">{item.artist}</span>
    </div>
  </>
);

const TrackMeta: FC<{ item: QueueItem; onNavigate: (path: string) => void }> = ({
  item,
  onNavigate,
}) => {
  if (item.contextPath) {
    return (
      <button
        type="button"
        aria-label={`Open ${item.name} by ${item.artist}`}
        onClick={() => onNavigate(item.contextPath!)}
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <TrackMetaContent item={item} />
      </button>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <TrackMetaContent item={item} />
    </div>
  );
};

export const GlobalPlayerBar: FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const nowPlayingTriggerRef = useRef<HTMLButtonElement>(null);
  const wasNowPlayingOpenRef = useRef(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isSidebarCollapsed = usePreferencesStore((s) => s.isSidebarCollapsed);

  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isQueuePanelOpen = usePlayerStore((s) => s.isQueuePanelOpen);
  const setQueuePanelOpen = usePlayerStore((s) => s.setQueuePanelOpen);
  const isNowPlayingOpen = usePlayerStore((s) => s.isNowPlayingOpen);
  const setNowPlayingOpen = usePlayerStore((s) => s.setNowPlayingOpen);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const error = usePlayerStore((s) => s.error);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const repeatMode = usePlayerStore((s) => s.repeatMode);

  const setAudioElement = usePlayerStore((s) => s.setAudioElement);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const _onLoadedMetadata = usePlayerStore((s) => s._onLoadedMetadata);
  const _onTimeUpdate = usePlayerStore((s) => s._onTimeUpdate);
  const _onEnded = usePlayerStore((s) => s._onEnded);
  const _onError = usePlayerStore((s) => s._onError);

  const currentItem = currentIndex !== null ? (queue[currentIndex] ?? null) : null;

  const mediaSessionActions = useMemo(
    () => ({
      play: () => {
        if (!usePlayerStore.getState().isPlaying) usePlayerStore.getState().togglePlay();
      },
      pause: () => {
        if (usePlayerStore.getState().isPlaying) usePlayerStore.getState().togglePlay();
      },
      next,
      previous: prev,
      seek,
    }),
    [next, prev, seek],
  );
  useMediaSession(currentItem, isPlaying, mediaSessionActions);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    setAudioElement(el);
    return () => {
      setAudioElement(null);
    };
  }, [setAudioElement]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => _onTimeUpdate(el.currentTime);
    const onLoadedMetadata = () => _onLoadedMetadata(el.duration);
    const onEnded = () => _onEnded();
    const onError = () => {
      const msg = el.error?.message ?? "Playback error";
      _onError(msg);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [_onTimeUpdate, _onLoadedMetadata, _onEnded, _onError]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentItem) return;
    if (el.src !== currentItem.audioUrl) {
      el.src = currentItem.audioUrl;
    }
  }, [currentItem]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentItem) return;
    if (isPlaying) {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        void playPromise.catch(() => {});
      }
    } else {
      el.pause();
    }
  }, [isPlaying, currentItem]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      usePlayerStore.setState({ error: null });
    }, 3000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (wasOpenRef.current && !isQueuePanelOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isQueuePanelOpen;
  }, [isQueuePanelOpen]);

  useEffect(() => {
    if (wasNowPlayingOpenRef.current && !isNowPlayingOpen) {
      nowPlayingTriggerRef.current?.focus();
    }
    wasNowPlayingOpenRef.current = isNowPlayingOpen;
  }, [isNowPlayingOpen]);

  const isVisible = currentIndex !== null || !!error;
  const isAtFirst =
    !shuffleMode && repeatMode !== "all" && (currentIndex === null || currentIndex <= 0);
  const isAtLast =
    !shuffleMode &&
    repeatMode !== "all" &&
    (currentIndex === null || currentIndex >= queue.length - 1);

  const shuffleAriaLabel = shuffleMode ? "Disable shuffle" : "Enable shuffle";
  const repeatAriaLabel =
    repeatMode === "off" ? "Enable repeat" : repeatMode === "all" ? "Repeat all" : "Repeat one";
  const isRepeatActive = repeatMode !== "off";

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== " ") return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "BUTTON" || tag === "INPUT") return;
    e.preventDefault();
    togglePlay();
  };

  return (
    <>
      <audio ref={audioRef} aria-label="Audio player" preload="metadata" className="hidden" />
      <QueueSidePanel />
      <NowPlayingFullscreen />

      {isVisible && (
        <section
          role="region"
          aria-label="Now playing"
          onKeyDown={onKeyDown}
          className={cn(
            "bg-black",
            "fixed right-0 bottom-16 left-0 z-40 transition-[left] duration-300 md:bottom-0",
            isSidebarCollapsed ? "md:left-20" : "md:left-64",
            "px-4 py-2",
          )}
        >
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
            <div className="flex min-w-0 flex-1 items-center">
              {error ? (
                <span className="text-sm text-red-400">{error}</span>
              ) : currentItem ? (
                <>
                  <button
                    type="button"
                    ref={nowPlayingTriggerRef}
                    aria-label={t("player.nowPlaying.open")}
                    aria-pressed={isNowPlayingOpen}
                    onClick={() => setNowPlayingOpen(true)}
                    className="flex min-w-0 items-center gap-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
                  >
                    <TrackMetaContent item={currentItem} />
                  </button>
                  <div className="hidden min-w-0 md:flex">
                    <TrackMeta item={currentItem} onNavigate={navigate} />
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  aria-label={shuffleAriaLabel}
                  onClick={toggleShuffle}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    shuffleMode ? "text-green-500" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <FontAwesomeIcon icon={faShuffle} className="text-sm" />
                </button>

                <button
                  type="button"
                  aria-label="Previous track"
                  disabled={isAtFirst}
                  onClick={prev}
                  className={cn(
                    "text-text-secondary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isAtFirst && "cursor-not-allowed opacity-40",
                  )}
                >
                  <FontAwesomeIcon icon={faBackwardStep} className="text-base" />
                </button>

                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  aria-pressed={isPlaying}
                  onClick={togglePlay}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow transition-transform hover:scale-105"
                >
                  <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-sm" />
                </button>

                <button
                  type="button"
                  aria-label="Next track"
                  disabled={isAtLast}
                  onClick={next}
                  className={cn(
                    "text-text-secondary hover:text-text-primary flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isAtLast && "cursor-not-allowed opacity-40",
                  )}
                >
                  <FontAwesomeIcon icon={faForwardStep} className="text-base" />
                </button>

                <button
                  type="button"
                  aria-label={repeatAriaLabel}
                  onClick={cycleRepeat}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isRepeatActive
                      ? "text-green-500"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <FontAwesomeIcon icon={faRepeat} className="text-sm" />
                  {repeatMode === "one" && (
                    <sup className="absolute -top-1 -right-1 text-[0.55rem] leading-none font-bold">
                      1
                    </sup>
                  )}
                </button>

                <button
                  ref={triggerRef}
                  type="button"
                  aria-label={
                    isQueuePanelOpen ? t("player.queue.toggleClose") : t("player.queue.toggleOpen")
                  }
                  aria-pressed={isQueuePanelOpen}
                  disabled={queue.length === 0}
                  onClick={() => setQueuePanelOpen(!isQueuePanelOpen)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isQueuePanelOpen
                      ? "text-green-500"
                      : "text-text-secondary hover:text-text-primary",
                    queue.length === 0 && "cursor-not-allowed opacity-40",
                  )}
                >
                  <FontAwesomeIcon icon={faListUl} className="text-sm" />
                </button>
              </div>

              <ProgressSection />
            </div>

            <div className="hidden flex-1 justify-end md:flex">
              <VolumeSection />
            </div>
          </div>
        </section>
      )}
    </>
  );
};
