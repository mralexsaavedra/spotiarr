import { useCallback, useMemo } from "react";
import { usePlayerStore, type QueueItem } from "@/store/usePlayerStore";

export const usePlayerQueueBinding = (queueItems: QueueItem[]) => {
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queue = usePlayerStore((state) => state.queue);

  const currentTrackId = usePlayerStore((state) => {
    if (state.currentIndex === null) return null;
    return state.queue[state.currentIndex]?.id ?? null;
  });

  const hasPlayableTracks = queueItems.length > 0;

  const isActiveContext = useMemo(() => {
    if (queueItems.length === 0 || queue.length === 0) return false;
    const contextPath = queueItems[0]?.contextPath;
    if (contextPath == null) return false;
    return queue.every((item) => item.contextPath === contextPath);
  }, [queue, queueItems]);

  const playFromIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= queueItems.length) return;
      usePlayerStore.getState().playQueue(queueItems, index);
    },
    [queueItems],
  );

  const onPlayTrack = useCallback(
    (trackId: string) => {
      const startIndex = queueItems.findIndex((item) => item.id === trackId);
      if (startIndex === -1) return;
      usePlayerStore.getState().playQueue(queueItems, startIndex);
    },
    [queueItems],
  );

  const onPauseTrack = useCallback(() => {
    usePlayerStore.getState().togglePlay();
  }, []);

  return {
    currentIndex,
    currentTrackId,
    isPlaying,
    isActiveContext,
    hasPlayableTracks,
    playFromIndex,
    onPlayTrack,
    onPauseTrack,
  };
};
