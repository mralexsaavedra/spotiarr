import { useCallback, useRef, useState } from "react";

type ReorderHandler = (from: number, to: number) => void;

export interface Reorderable {
  draggingIndex: number | null;
  dragOverIndex: number | null;
  draggingIndexRef: React.MutableRefObject<number | null>;
  dragOverIndexRef: React.MutableRefObject<number | null>;
  startDrag: (index: number) => void;
  setDropTarget: (index: number) => void;
  clearDropTarget: () => void;
  cancelDrag: () => void;
  commit: (to?: number | null) => void;
  moveUp: (index: number) => void;
  moveDown: (index: number, itemCount: number) => void;
}

export function useReorderable(onReorder: ReorderHandler): Reorderable {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggingIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    draggingIndexRef.current = null;
    dragOverIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  const startDrag = useCallback((index: number) => {
    draggingIndexRef.current = index;
    dragOverIndexRef.current = null;
    setDraggingIndex(index);
    setDragOverIndex(null);
  }, []);

  const setDropTarget = useCallback((index: number) => {
    if (dragOverIndexRef.current === index) return;
    dragOverIndexRef.current = index;
    setDragOverIndex(index);
  }, []);

  const clearDropTarget = useCallback(() => {
    dragOverIndexRef.current = null;
    setDragOverIndex(null);
  }, []);

  const commit = useCallback(
    (to?: number | null) => {
      const from = draggingIndexRef.current;
      const target = to ?? dragOverIndexRef.current ?? from;
      reset();
      if (from !== null && target !== null && from !== target) onReorder(from, target);
    },
    [onReorder, reset],
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index > 0) onReorder(index, index - 1);
    },
    [onReorder],
  );

  const moveDown = useCallback(
    (index: number, itemCount: number) => {
      if (index < itemCount - 1) onReorder(index, index + 1);
    },
    [onReorder],
  );

  return {
    draggingIndex,
    dragOverIndex,
    draggingIndexRef,
    dragOverIndexRef,
    startDrag,
    setDropTarget,
    clearDropTarget,
    cancelDrag: reset,
    commit,
    moveUp,
    moveDown,
  };
}
