import { faChevronDown, faGripLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/utils/cn";
import { Image } from "../atoms/Image";
import { TransportControls } from "../molecules/TransportControls";

function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

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

  const currentItem = currentIndex !== null ? (queue[currentIndex] ?? null) : null;

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

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

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const onHandlePointerDown = (e: React.PointerEvent, index: number) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingIndexRef.current = index;
    dragOverIndexRef.current = null;
    setDraggingIndex(index);
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (draggingIndexRef.current === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-row-index]") as HTMLElement | null;
    const overIndex = row ? Number(row.dataset.rowIndex) : null;
    if (overIndex !== null && overIndex !== dragOverIndexRef.current) {
      dragOverIndexRef.current = overIndex;
      setDragOverIndex(overIndex);
    }
  };

  const onHandlePointerUp = (e: React.PointerEvent) => {
    if (draggingIndexRef.current === null) return;
    const from = draggingIndexRef.current;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest("[data-row-index]") as HTMLElement | null;
    const to = row ? Number(row.dataset.rowIndex) : (dragOverIndexRef.current ?? from);
    draggingIndexRef.current = null;
    dragOverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
    if (from !== to) reorderQueue(from, to);
  };

  const onHandlePointerCancel = () => {
    draggingIndexRef.current = null;
    dragOverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
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
        "fixed inset-0 z-[70] flex flex-col md:hidden",
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
        <div className="group flex w-full items-center gap-2">
          <span className="text-text-secondary w-8 shrink-0 text-right text-xs tabular-nums">
            {formatSeconds(currentTime)}
          </span>
          <input
            type="range"
            role="slider"
            aria-label={t("player.transport.seek")}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-valuetext={`${formatSeconds(currentTime)} of ${formatSeconds(duration)}`}
            min={0}
            max={duration || 1}
            step={1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, white ${pct}%, rgba(255,255,255,0.3) ${pct}%)`,
            }}
          />
          <span className="text-text-secondary w-8 shrink-0 text-xs tabular-nums">
            {formatSeconds(duration)}
          </span>
        </div>
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
        />
      </div>

      <section
        className="pb-safe flex-1 overflow-y-auto px-4"
        aria-label={t("player.nowPlaying.queueLabel")}
        data-no-swipe
      >
        <ul>
          {queue.map((item, index) => (
            <li
              key={item.id}
              data-row-index={index}
              aria-current={index === currentIndex ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 rounded px-2 py-2",
                index === currentIndex && "bg-white/5 text-green-400",
                draggingIndex === index && "opacity-50",
                dragOverIndex === index && draggingIndex !== index && "border-t-2 border-green-500",
              )}
            >
              <button
                type="button"
                aria-label={item.name}
                onClick={() => playFromIndex(index)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <span className="truncate text-sm text-white">{item.name}</span>
                <span className="text-text-secondary truncate text-xs">{item.artist}</span>
              </button>

              <button
                type="button"
                aria-label={t("player.nowPlaying.moveUp", { name: item.name })}
                disabled={index === 0}
                onClick={() => index > 0 && reorderQueue(index, index - 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/80"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={t("player.nowPlaying.moveDown", { name: item.name })}
                disabled={index === queue.length - 1}
                onClick={() => index < queue.length - 1 && reorderQueue(index, index + 1)}
                className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/80"
              >
                ↓
              </button>

              <span
                role="button"
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
          ))}
        </ul>
      </section>
    </aside>
  );
};
