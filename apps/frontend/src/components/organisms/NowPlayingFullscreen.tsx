import { faChevronDown, faGripLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReorderable } from "@/hooks/useReorderable";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/utils/cn";
import { Image } from "../atoms/Image";
import { ProgressSlider } from "../molecules/ProgressSlider";
import { TransportControls } from "../molecules/TransportControls";

export const NowPlayingFullscreen: FC = () => {
  const { t } = useTranslation();

  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isNowPlayingOpen = usePlayerStore((s) => s.isNowPlayingOpen);
  const setNowPlayingOpen = usePlayerStore((s) => s.setNowPlayingOpen);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const playFromIndex = usePlayerStore((s) => s.playFromIndex);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const isBuffering = usePlayerStore((s) => s.isBuffering);

  const currentItem = currentIndex !== null ? (queue[currentIndex] ?? null) : null;

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const {
    draggingIndex,
    dragOverIndex,
    draggingIndexRef,
    startDrag,
    setDropTarget,
    commit,
    cancelDrag,
    moveUp,
    moveDown,
  } = useReorderable(reorderQueue);

  const swipeStartYRef = useRef<number | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  useEffect(() => {
    if (!isNowPlayingOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNowPlayingOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isNowPlayingOpen, setNowPlayingOpen]);

  useEffect(() => {
    if (isNowPlayingOpen) closeButtonRef.current?.focus();
  }, [isNowPlayingOpen]);

  useEffect(() => {
    if (!isNowPlayingOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isNowPlayingOpen]);

  const onHandlePointerDown = (e: React.PointerEvent, index: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startDrag(index);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (draggingIndexRef.current === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-row-index]") as HTMLElement | null;
    if (row) setDropTarget(Number(row.dataset.rowIndex));
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (draggingIndexRef.current === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-row-index]") as HTMLElement | null;
    commit(row ? Number(row.dataset.rowIndex) : undefined);
  };

  const onHandlePointerCancel = () => {
    cancelDrag();
  };

  const onSwipePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    swipeStartYRef.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onSwipePointerMove = (e: React.PointerEvent) => {
    if (swipeStartYRef.current === null) return;
    const dy = Math.max(0, e.clientY - swipeStartYRef.current);
    setDragOffsetY(dy);
  };

  const onSwipePointerUp = (e: React.PointerEvent) => {
    if (swipeStartYRef.current === null) return;
    const dy = e.clientY - swipeStartYRef.current;
    swipeStartYRef.current = null;
    setDragOffsetY(0);
    if (dy >= 80) setNowPlayingOpen(false);
  };

  return (
    <aside
      role="dialog"
      aria-modal="true"
      aria-label={t("player.nowPlaying.title")}
      className={cn(
        "fixed inset-0 z-[70] flex h-dvh flex-col overflow-hidden bg-black md:hidden",
        "transition-transform duration-300 motion-reduce:transition-none",
        isNowPlayingOpen
          ? "pointer-events-auto translate-y-0"
          : "pointer-events-none translate-y-full",
      )}
      style={
        dragOffsetY > 0
          ? { transform: `translateY(${dragOffsetY}px)`, transitionProperty: "none" }
          : undefined
      }
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {currentItem?.artworkUrl && (
          <img
            src={currentItem.artworkUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-125 object-cover opacity-70 blur-3xl"
          />
        )}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div
        data-swipe-zone
        onPointerDown={onSwipePointerDown}
        onPointerMove={onSwipePointerMove}
        onPointerUp={onSwipePointerUp}
        onPointerCancel={() => {
          swipeStartYRef.current = null;
          setDragOffsetY(0);
        }}
        className="flex flex-col"
      >
        <header className="flex items-center justify-between px-4 pt-4">
          <button
            type="button"
            ref={closeButtonRef}
            data-no-swipe
            aria-label={t("player.nowPlaying.close")}
            onClick={() => setNowPlayingOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
          <span className="sr-only">{t("player.nowPlaying.title")}</span>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-4">
          <div className="aspect-square w-[70vw] max-w-[280px] overflow-hidden rounded-lg shadow-2xl">
            <Image src={currentItem?.artworkUrl} alt={currentItem?.name ?? ""} />
          </div>
        </div>

        <div className="px-6 text-center">
          <div className="truncate text-lg font-semibold text-white">{currentItem?.name}</div>
          <div className="text-text-secondary truncate text-sm">{currentItem?.artist}</div>
        </div>
      </div>

      <div className="px-6 py-3">
        <ProgressSlider
          variant="fullscreen"
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          ariaLabel={t("player.transport.seek")}
        />
      </div>

      <div className="flex items-center justify-center px-6 pb-4">
        <TransportControls
          size="large"
          currentTrack={currentItem ?? null}
          isPlaying={isPlaying}
          shuffleMode={shuffleMode}
          repeatMode={repeatMode}
          onPlayPause={togglePlay}
          onPrev={prev}
          onNext={next}
          onShuffleToggle={toggleShuffle}
          onRepeatCycle={cycleRepeat}
          isBuffering={isBuffering}
        />
      </div>

      <section
        className="pb-safe flex-1 overflow-y-auto px-4"
        aria-label={t("player.nowPlaying.queueLabel")}
        data-no-swipe
      >
        <ul>
          {queue.map((item, index) => {
            const isCurrent = index === currentIndex;
            return (
              <li
                key={item.id}
                data-row-index={index}
                aria-current={isCurrent ? "true" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-2",
                  isCurrent ? "bg-white/5 text-green-400" : "text-white",
                  draggingIndex === index && "opacity-50",
                  dragOverIndex === index &&
                    draggingIndex !== index &&
                    "border-t-2 border-green-500",
                )}
              >
                <button
                  type="button"
                  aria-label={item.name}
                  onClick={() => playFromIndex(index)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="truncate text-sm font-medium">{item.name}</span>
                  <span
                    className={cn(
                      "truncate text-xs",
                      isCurrent ? "text-green-400/80" : "text-white/50",
                    )}
                  >
                    {item.artist}
                  </span>
                </button>

                <button
                  type="button"
                  aria-label={t("player.nowPlaying.moveUp", { name: item.name })}
                  disabled={index === 0}
                  onClick={() => moveUp(index)}
                  className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/80"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={t("player.nowPlaying.moveDown", { name: item.name })}
                  disabled={index === queue.length - 1}
                  onClick={() => moveDown(index, queue.length)}
                  className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/80"
                >
                  ↓
                </button>

                <span
                  role="button"
                  tabIndex={0}
                  data-drag-handle
                  aria-label={t("player.nowPlaying.dragHandle", { name: item.name })}
                  onPointerDown={(e) => onHandlePointerDown(e, index)}
                  onPointerMove={onHandlePointerMove}
                  onPointerUp={onHandlePointerUp}
                  onPointerCancel={onHandlePointerCancel}
                  className="cursor-grab touch-none p-2 text-white/60 active:cursor-grabbing"
                  style={{ touchAction: "none" }}
                >
                  <FontAwesomeIcon icon={faGripLines} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
};
