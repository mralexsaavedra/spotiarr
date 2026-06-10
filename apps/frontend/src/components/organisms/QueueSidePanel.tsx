import { faChevronDown, faChevronUp, faShuffle, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useReorderable } from "@/hooks/useReorderable";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cn } from "@/utils/cn";

export const QueueSidePanel: FC = () => {
  const { t } = useTranslation();
  const activeRowRef = useRef<HTMLLIElement>(null);

  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const isQueuePanelOpen = usePlayerStore((s) => s.isQueuePanelOpen);
  const setQueuePanelOpen = usePlayerStore((s) => s.setQueuePanelOpen);
  const playFromIndex = usePlayerStore((s) => s.playFromIndex);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);

  const {
    draggingIndex,
    dragOverIndex,
    startDrag,
    setDropTarget,
    clearDropTarget,
    cancelDrag,
    commit,
    moveUp,
    moveDown,
  } = useReorderable(reorderQueue);

  useEffect(() => {
    if (!isQueuePanelOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQueuePanelOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isQueuePanelOpen, setQueuePanelOpen]);

  useEffect(() => {
    if (isQueuePanelOpen && activeRowRef.current?.scrollIntoView) {
      activeRowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isQueuePanelOpen, currentIndex]);

  return (
    <>
      {isQueuePanelOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          data-testid="queue-backdrop"
          className="fixed inset-0 z-[55] bg-black/40"
          onClick={(e) => {
            e.stopPropagation();
            setQueuePanelOpen(false);
          }}
        />
      )}

      <aside
        role="complementary"
        aria-label={t("player.queue.title")}
        className={cn(
          "fixed top-0 right-0 bottom-16 z-60 w-full md:bottom-0 md:w-80",
          "flex flex-col bg-zinc-900 transition-transform duration-300",
          isQueuePanelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{t("player.queue.title")}</span>
            {shuffleMode && (
              <span className="flex items-center gap-1 text-xs text-green-500">
                <FontAwesomeIcon icon={faShuffle} />
                <span>{t("player.queue.shuffleOn")}</span>
              </span>
            )}
            {repeatMode !== "off" && (
              <span className="text-xs font-medium tracking-wide text-white/60 uppercase">
                {repeatMode === "all" ? t("player.queue.repeatAll") : t("player.queue.repeatOne")}
              </span>
            )}
          </div>

          <button
            type="button"
            aria-label={t("player.queue.close")}
            onClick={() => setQueuePanelOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <p className="mt-8 px-4 text-center text-sm text-white/40">{t("player.queue.empty")}</p>
          ) : (
            <ul className="py-2">
              {queue.map((item, index) => {
                const isCurrent = index === currentIndex;
                const isDragging = draggingIndex === index;
                const isDropTarget = dragOverIndex === index && draggingIndex !== index;
                return (
                  <li
                    key={item.id}
                    ref={isCurrent ? activeRowRef : undefined}
                    aria-current={isCurrent ? "true" : undefined}
                    draggable
                    className={cn(
                      "flex items-center",
                      isDragging && "cursor-grabbing opacity-50",
                      isDropTarget && "border-t-2 border-green-500",
                      !isDragging && "cursor-grab",
                    )}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(index));
                      e.dataTransfer.effectAllowed = "move";
                      startDrag(index);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                      setDropTarget(index);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) clearDropTarget();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      commit(index);
                    }}
                    onDragEnd={() => {
                      cancelDrag();
                    }}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 flex-1 flex-col items-start px-4 py-2 text-left transition-colors hover:bg-white/5",
                        isCurrent ? "bg-white/5 text-green-400" : "text-white",
                      )}
                      onClick={() => playFromIndex(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") playFromIndex(index);
                      }}
                    >
                      <span className="w-full truncate text-sm font-medium">{item.name}</span>
                      <span className="w-full truncate text-xs text-white/50">{item.artist}</span>
                    </button>

                    <div className="flex items-center gap-1 pr-2">
                      <button
                        type="button"
                        aria-label={t("player.queue.moveUp", { name: item.name })}
                        disabled={index === 0}
                        onClick={() => moveUp(index)}
                        className="flex h-7 w-7 items-center justify-center rounded text-white/40 transition-colors hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <FontAwesomeIcon icon={faChevronUp} className="text-xs" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("player.queue.moveDown", { name: item.name })}
                        disabled={index === queue.length - 1}
                        onClick={() => moveDown(index, queue.length)}
                        className="flex h-7 w-7 items-center justify-center rounded text-white/40 transition-colors hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
};
