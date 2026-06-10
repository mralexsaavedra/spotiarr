import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReorderable } from "./useReorderable";

describe("useReorderable", () => {
  it("starts with no drag state", () => {
    const { result } = renderHook(() => useReorderable(vi.fn()));
    expect(result.current.draggingIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it("startDrag sets the dragging index", () => {
    const { result } = renderHook(() => useReorderable(vi.fn()));
    act(() => result.current.startDrag(2));
    expect(result.current.draggingIndex).toBe(2);
  });

  it("setDropTarget sets the drag-over index", () => {
    const { result } = renderHook(() => useReorderable(vi.fn()));
    act(() => {
      result.current.startDrag(0);
      result.current.setDropTarget(3);
    });
    expect(result.current.dragOverIndex).toBe(3);
  });

  it("commit(to) calls onReorder(from, to) and resets state", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.startDrag(1));
    act(() => result.current.commit(3));
    expect(onReorder).toHaveBeenCalledWith(1, 3);
    expect(result.current.draggingIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it("commit() without an explicit target uses the current drop-over index", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => {
      result.current.startDrag(0);
      result.current.setDropTarget(2);
    });
    act(() => result.current.commit());
    expect(onReorder).toHaveBeenCalledWith(0, 2);
  });

  it("commit does not call onReorder when from === to", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.startDrag(2));
    act(() => result.current.commit(2));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("commit without an active drag is a no-op", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.commit(1));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("cancelDrag resets state without calling onReorder", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => {
      result.current.startDrag(1);
      result.current.setDropTarget(2);
    });
    act(() => result.current.cancelDrag());
    expect(onReorder).not.toHaveBeenCalled();
    expect(result.current.draggingIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
  });

  it("clearDropTarget clears only the drag-over index", () => {
    const { result } = renderHook(() => useReorderable(vi.fn()));
    act(() => {
      result.current.startDrag(0);
      result.current.setDropTarget(2);
    });
    act(() => result.current.clearDropTarget());
    expect(result.current.dragOverIndex).toBeNull();
    expect(result.current.draggingIndex).toBe(0);
  });

  it("moveUp calls onReorder(index, index - 1) above the first row", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.moveUp(2));
    expect(onReorder).toHaveBeenCalledWith(2, 1);
  });

  it("moveUp on the first row is a no-op", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.moveUp(0));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("moveDown calls onReorder(index, index + 1) below the last row", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.moveDown(0, 3));
    expect(onReorder).toHaveBeenCalledWith(0, 1);
  });

  it("moveDown on the last row is a no-op", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useReorderable(onReorder));
    act(() => result.current.moveDown(2, 3));
    expect(onReorder).not.toHaveBeenCalled();
  });
});
