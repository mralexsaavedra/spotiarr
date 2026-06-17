import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerStore, type QueueItem } from "@/store/usePlayerStore";
import { usePlayerQueueBinding } from "./usePlayerQueueBinding";

const makeItem = (id: string, overrides: Partial<QueueItem> = {}): QueueItem => ({
  id,
  name: `Track ${id}`,
  artist: "Artist",
  audioUrl: `https://example.com/${id}.mp3`,
  ...overrides,
});

describe("usePlayerQueueBinding", () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      currentIndex: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null currentTrackId when nothing is playing", () => {
    const items = [makeItem("a"), makeItem("b")];
    const { result } = renderHook(() => usePlayerQueueBinding(items));

    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentIndex).toBeNull();
  });

  it("reflects store state when playback is active", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.setState({ queue: items, currentIndex: 1, isPlaying: true });

    const { result } = renderHook(() => usePlayerQueueBinding(items));

    expect(result.current.currentTrackId).toBe("b");
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isPlaying).toBe(true);
  });

  it("hasPlayableTracks reflects queue length", () => {
    const empty = renderHook(() => usePlayerQueueBinding([]));
    expect(empty.result.current.hasPlayableTracks).toBe(false);

    const populated = renderHook(() => usePlayerQueueBinding([makeItem("a")]));
    expect(populated.result.current.hasPlayableTracks).toBe(true);
  });

  it("onPlayTrack dispatches playQueue with the matching index", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const playQueue = vi.spyOn(usePlayerStore.getState(), "playQueue");

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    act(() => result.current.onPlayTrack("b"));

    expect(playQueue).toHaveBeenCalledWith(items, 1);
  });

  it("onPlayTrack is a no-op when trackId is not in queue", () => {
    const items = [makeItem("a")];
    const playQueue = vi.spyOn(usePlayerStore.getState(), "playQueue");

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    act(() => result.current.onPlayTrack("ghost"));

    expect(playQueue).not.toHaveBeenCalled();
  });

  it("onPauseTrack calls togglePlay", () => {
    const togglePlay = vi.spyOn(usePlayerStore.getState(), "togglePlay");

    const { result } = renderHook(() => usePlayerQueueBinding([makeItem("a")]));
    act(() => result.current.onPauseTrack());

    expect(togglePlay).toHaveBeenCalled();
  });

  it("playFromIndex dispatches playQueue with the given index", () => {
    const items = [makeItem("a"), makeItem("b")];
    const playQueue = vi.spyOn(usePlayerStore.getState(), "playQueue");

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    act(() => result.current.playFromIndex(1));

    expect(playQueue).toHaveBeenCalledWith(items, 1);
  });

  it("playFromIndex is a no-op for out-of-range indices", () => {
    const items = [makeItem("a")];
    const playQueue = vi.spyOn(usePlayerStore.getState(), "playQueue");

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    act(() => result.current.playFromIndex(-1));
    act(() => result.current.playFromIndex(5));

    expect(playQueue).not.toHaveBeenCalled();
  });

  const ctx = "/playlist/p1?mode=library";
  const makeCtxItem = (id: string, contextPath = ctx) => makeItem(id, { contextPath });

  it("isActiveContext is false when store queue is empty", () => {
    const items = [makeCtxItem("a"), makeCtxItem("b")];
    const { result } = renderHook(() => usePlayerQueueBinding(items));
    expect(result.current.isActiveContext).toBe(false);
  });

  it("isActiveContext is true when the store queue belongs to this context", () => {
    const items = [makeCtxItem("a"), makeCtxItem("b")];
    usePlayerStore.setState({ queue: items, currentIndex: 0, isPlaying: true });

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    expect(result.current.isActiveContext).toBe(true);
  });

  it("isActiveContext stays true when the active queue is reordered (order-independent)", () => {
    const items = [makeCtxItem("a"), makeCtxItem("b"), makeCtxItem("c")];
    usePlayerStore.setState({
      queue: [makeCtxItem("c"), makeCtxItem("a"), makeCtxItem("b")],
      currentIndex: 0,
      isPlaying: true,
    });

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    expect(result.current.isActiveContext).toBe(true);
  });

  it("isActiveContext is false when another context plays the same track ids", () => {
    const items = [makeCtxItem("a"), makeCtxItem("b")];
    usePlayerStore.setState({
      queue: [
        makeCtxItem("a", "/playlist/p2?mode=library"),
        makeCtxItem("b", "/playlist/p2?mode=library"),
      ],
      currentIndex: 0,
      isPlaying: true,
    });

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    expect(result.current.isActiveContext).toBe(false);
  });

  it("isActiveContext is false when queue items have no contextPath", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.setState({ queue: items, currentIndex: 0, isPlaying: true });

    const { result } = renderHook(() => usePlayerQueueBinding(items));
    expect(result.current.isActiveContext).toBe(false);
  });
});
