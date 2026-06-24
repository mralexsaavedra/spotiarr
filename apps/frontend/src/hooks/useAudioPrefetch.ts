import { useEffect, useMemo, useRef } from "react";
import type { QueueItem } from "@/store/usePlayerStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";

type RepeatMode = "off" | "all" | "one";

interface PrefetchState {
  queue: QueueItem[];
  currentIndex: number | null;
  shuffleMode: boolean;
  shuffleOrder: number[];
  shuffleOrderIndex: number;
  repeatMode: RepeatMode;
}

export function computeNextAudioUrls(state: PrefetchState, n: number): string[] {
  const { queue, currentIndex, shuffleMode, shuffleOrder, shuffleOrderIndex, repeatMode } = state;

  if (n <= 0 || currentIndex === null || queue.length === 0) return [];

  if (repeatMode === "one") return [];

  const currentUrl = queue[currentIndex]?.audioUrl;
  const results: string[] = [];

  if (shuffleMode) {
    for (let i = 1; i <= n; i++) {
      const orderIdx = shuffleOrderIndex + i;
      if (repeatMode === "all") {
        const wrappedOrderIdx = orderIdx % shuffleOrder.length;
        const queueIdx = shuffleOrder[wrappedOrderIdx];
        if (queueIdx === undefined) break;
        const url = queue[queueIdx]?.audioUrl;
        if (url && url !== currentUrl) results.push(url);
      } else {
        if (orderIdx >= shuffleOrder.length) break;
        const queueIdx = shuffleOrder[orderIdx];
        if (queueIdx === undefined) break;
        const url = queue[queueIdx]?.audioUrl;
        if (url && url !== currentUrl) results.push(url);
      }
    }
    return results;
  }

  for (let i = 1; i <= n; i++) {
    let nextIdx = currentIndex + i;
    if (nextIdx >= queue.length) {
      if (repeatMode === "all") {
        nextIdx = nextIdx % queue.length;
      } else {
        break;
      }
    }
    const url = queue[nextIdx]?.audioUrl;
    if (url && url !== currentUrl) results.push(url);
  }

  return results;
}

export function useAudioPrefetch(warmerRef: React.RefObject<HTMLAudioElement | null>): void {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const shuffleMode = usePlayerStore((s) => s.shuffleMode);
  const shuffleOrder = usePlayerStore((s) => s.shuffleOrder);
  const shuffleOrderIndex = usePlayerStore((s) => s.shuffleOrderIndex);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const audioPrefetchCount = usePreferencesStore((s) => s.audioPrefetchCount);

  const nextUrl = useMemo(
    () =>
      computeNextAudioUrls(
        { queue, currentIndex, shuffleMode, shuffleOrder, shuffleOrderIndex, repeatMode },
        audioPrefetchCount,
      )[0] ?? null,
    [
      queue,
      currentIndex,
      shuffleMode,
      shuffleOrder,
      shuffleOrderIndex,
      repeatMode,
      audioPrefetchCount,
    ],
  );

  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const el = warmerRef.current;
    if (!el) return;

    if (audioPrefetchCount <= 0) {
      return;
    }

    if (nextUrl === prevUrlRef.current) return;
    prevUrlRef.current = nextUrl;

    if (!nextUrl) {
      el.src = "";
      return;
    }

    el.src = nextUrl;
    el.load();
  }, [nextUrl, audioPrefetchCount, warmerRef]);
}
