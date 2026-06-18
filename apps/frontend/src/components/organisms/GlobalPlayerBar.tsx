import {
  faChevronUp,
  faListUl,
  faVolumeHigh,
  faVolumeXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useFocusReturnOnClose } from "@/hooks/useFocusReturnOnClose";
import { useGlobalPlayerShortcuts } from "@/hooks/useGlobalPlayerShortcuts";
import { useMediaSession } from "@/hooks/useMediaSession";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { QueueItem } from "@/store/usePlayerStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { cn } from "@/utils/cn";
import { Image } from "../atoms/Image";
import { ProgressSlider } from "../molecules/ProgressSlider";
import { TransportControls } from "../molecules/TransportControls";
import { NowPlayingFullscreen } from "./NowPlayingFullscreen";
import { QueueSidePanel } from "./QueueSidePanel";

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
    <div className="flex min-w-0 flex-col text-left">
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
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const registerAudioEl = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    setAudioEl(el);
  }, []);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nowPlayingTriggerRef = useRef<HTMLButtonElement>(null);
  const seekRestoredRef = useRef(false);
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

  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);

  const setAudioElement = usePlayerStore((s) => s.setAudioElement);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const _onLoadedMetadata = usePlayerStore((s) => s._onLoadedMetadata);
  const _onTimeUpdate = usePlayerStore((s) => s._onTimeUpdate);
  const _onEnded = usePlayerStore((s) => s._onEnded);
  const _onError = usePlayerStore((s) => s._onError);
  const _onWaiting = usePlayerStore((s) => s._onWaiting);
  const _onCanPlay = usePlayerStore((s) => s._onCanPlay);
  const _onPlay = usePlayerStore((s) => s._onPlay);
  const _onPause = usePlayerStore((s) => s._onPause);
  const isBuffering = usePlayerStore((s) => s.isBuffering);

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
  useMediaSession(currentItem, isPlaying, mediaSessionActions, audioEl);
  useGlobalPlayerShortcuts();
  useFocusReturnOnClose(isQueuePanelOpen, triggerRef);
  useFocusReturnOnClose(isNowPlayingOpen, nowPlayingTriggerRef);

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
    const onWaiting = () => _onWaiting();
    const onStalled = () => _onWaiting();
    const onPlaying = () => _onCanPlay();
    const onCanPlay = () => _onCanPlay();
    const onPlay = () => _onPlay();
    const onPause = () => {
      if (!el.ended) _onPause();
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("stalled", onStalled);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [
    _onTimeUpdate,
    _onLoadedMetadata,
    _onEnded,
    _onError,
    _onWaiting,
    _onCanPlay,
    _onPlay,
    _onPause,
  ]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentItem) return;
    const startAt = usePlayerStore.getState().currentTime;
    if (startAt <= 0) return;
    const restoreIndex = usePlayerStore.getState().currentIndex;

    const onFirstMetadata = () => {
      if (!seekRestoredRef.current) {
        if (usePlayerStore.getState().currentIndex !== restoreIndex) {
          seekRestoredRef.current = true;
          el.removeEventListener("loadedmetadata", onFirstMetadata);
          return;
        }
        el.currentTime = startAt;
        seekRestoredRef.current = true;
      }
      el.removeEventListener("loadedmetadata", onFirstMetadata);
    };

    el.addEventListener("loadedmetadata", onFirstMetadata);
    return () => {
      el.removeEventListener("loadedmetadata", onFirstMetadata);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = isMuted;
  }, [volume, isMuted]);

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
        void playPromise.catch((err: { name?: string } | null) => {
          if (err?.name === "NotAllowedError") {
            usePlayerStore.getState()._onPause();
          }
        });
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

  const isVisible = currentIndex !== null || !!error;
  const isAtFirst =
    !shuffleMode && repeatMode !== "all" && (currentIndex === null || currentIndex <= 0);
  const isAtLast =
    !shuffleMode &&
    repeatMode !== "all" &&
    (currentIndex === null || currentIndex >= queue.length - 1);

  return (
    <>
      <audio
        ref={registerAudioEl}
        aria-label="Audio player"
        preload="metadata"
        className="hidden"
      />
      <QueueSidePanel />
      <NowPlayingFullscreen />

      {isVisible && (
        <section
          role="region"
          aria-label="Now playing"
          className={cn(
            "bg-black",
            "fixed right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 z-40 transition-[left] duration-300 md:bottom-0",
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
                    className="flex w-full min-w-0 items-center gap-3 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 md:hidden"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded shadow-sm">
                      <Image
                        src={currentItem.artworkUrl}
                        alt={currentItem.name}
                        className="rounded"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                      <span className="w-full truncate text-sm font-semibold text-white">
                        {currentItem.name}
                      </span>
                      <span className="text-text-secondary w-full truncate text-xs">
                        {currentItem.artist}
                      </span>
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronUp}
                      aria-hidden="true"
                      className="shrink-0 text-xs text-white/60"
                    />
                  </button>
                  <div className="hidden min-w-0 md:flex">
                    <TrackMeta item={currentItem} onNavigate={navigate} />
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-center gap-4">
                <TransportControls
                  size="default"
                  currentTrack={currentItem ?? null}
                  isPlaying={isPlaying}
                  shuffleMode={shuffleMode}
                  repeatMode={repeatMode}
                  onPlayPause={togglePlay}
                  onPrev={prev}
                  onNext={next}
                  onShuffleToggle={toggleShuffle}
                  onRepeatCycle={cycleRepeat}
                  isPrevDisabled={isAtFirst}
                  isNextDisabled={isAtLast}
                  isBuffering={isBuffering}
                />

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

              <ProgressSlider
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
                ariaLabel={t("player.transport.seek")}
                variant="bar"
              />
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
