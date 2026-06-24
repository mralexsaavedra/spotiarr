import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { computeNextAudioUrls, useAudioPrefetch } from "./useAudioPrefetch";

function makeQueue(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `track-${i}`,
    name: `Track ${i}`,
    artist: "Artist",
    audioUrl: `http://localhost/api/library/audio?path=/track-${i}.mp3`,
  }));
}

const DEFAULT_STATE = {
  shuffleMode: false,
  shuffleOrder: [] as number[],
  shuffleOrderIndex: -1,
  repeatMode: "off" as const,
};

describe("computeNextAudioUrls", () => {
  it("non-shuffle: returns next N urls from currentIndex+1", () => {
    const queue = makeQueue(6);
    const result = computeNextAudioUrls({ queue, currentIndex: 1, ...DEFAULT_STATE }, 3);
    expect(result).toEqual([queue[2]!.audioUrl, queue[3]!.audioUrl, queue[4]!.audioUrl]);
  });

  it("non-shuffle: at last index returns []", () => {
    const queue = makeQueue(4);
    const result = computeNextAudioUrls({ queue, currentIndex: 3, ...DEFAULT_STATE }, 3);
    expect(result).toEqual([]);
  });

  it("non-shuffle: fewer than N remaining clamps to available", () => {
    const queue = makeQueue(5);
    const result = computeNextAudioUrls({ queue, currentIndex: 3, ...DEFAULT_STATE }, 3);
    expect(result).toEqual([queue[4]!.audioUrl]);
  });

  it("N=0 returns []", () => {
    const queue = makeQueue(6);
    const result = computeNextAudioUrls({ queue, currentIndex: 1, ...DEFAULT_STATE }, 0);
    expect(result).toEqual([]);
  });

  it("N > remaining clamps without error", () => {
    const queue = makeQueue(3);
    const result = computeNextAudioUrls({ queue, currentIndex: 1, ...DEFAULT_STATE }, 10);
    expect(result).toEqual([queue[2]!.audioUrl]);
  });

  it("dedup: current track url is not included in output", () => {
    const queue = makeQueue(4);
    const customQueue = [...queue];
    customQueue[2] = { ...customQueue[2]!, audioUrl: customQueue[1]!.audioUrl };
    const result = computeNextAudioUrls(
      { queue: customQueue, currentIndex: 1, ...DEFAULT_STATE },
      3,
    );
    expect(result).not.toContain(customQueue[1]!.audioUrl);
  });

  it("shuffle mode: maps via shuffleOrder indices correctly", () => {
    const queue = makeQueue(5);
    const result = computeNextAudioUrls(
      {
        queue,
        currentIndex: 0,
        shuffleMode: true,
        shuffleOrder: [2, 0, 4, 1, 3],
        shuffleOrderIndex: 1,
        repeatMode: "off",
      },
      2,
    );
    // Next 2 in shuffle order after index 1: shuffleOrder[2]=4, shuffleOrder[3]=1
    expect(result).toEqual([queue[4]!.audioUrl, queue[1]!.audioUrl]);
  });

  it("repeatMode=all non-shuffle: wraps modulo queue.length", () => {
    const queue = makeQueue(4);
    const result = computeNextAudioUrls(
      {
        queue,
        currentIndex: 2,
        shuffleMode: false,
        shuffleOrder: [],
        shuffleOrderIndex: -1,
        repeatMode: "all",
      },
      3,
    );
    // currentIndex=2, next: 3, 0, 1
    expect(result).toEqual([queue[3]!.audioUrl, queue[0]!.audioUrl, queue[1]!.audioUrl]);
  });

  it("repeatMode=one: returns []", () => {
    const queue = makeQueue(5);
    const result = computeNextAudioUrls(
      {
        queue,
        currentIndex: 2,
        shuffleMode: false,
        shuffleOrder: [],
        shuffleOrderIndex: -1,
        repeatMode: "one",
      },
      3,
    );
    expect(result).toEqual([]);
  });

  it("currentIndex=null returns []", () => {
    const queue = makeQueue(4);
    const result = computeNextAudioUrls({ queue, currentIndex: null, ...DEFAULT_STATE }, 3);
    expect(result).toEqual([]);
  });

  it("empty queue returns []", () => {
    const result = computeNextAudioUrls({ queue: [], currentIndex: null, ...DEFAULT_STATE }, 3);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// useAudioPrefetch hook tests
// ---------------------------------------------------------------------------

function makeWarmerRef(el: HTMLAudioElement) {
  return { current: el } as React.RefObject<HTMLAudioElement | null>;
}

function makeMockAudioElement() {
  return {
    src: "",
    load: vi.fn(),
    play: vi.fn(),
  } as unknown as HTMLAudioElement;
}

beforeEach(() => {
  vi.resetModules();
  usePlayerStore.setState({
    queue: [],
    currentIndex: null,
    shuffleMode: false,
    shuffleOrder: [],
    shuffleOrderIndex: -1,
    repeatMode: "off",
  });
  usePreferencesStore.setState({ audioPrefetchCount: 3 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAudioPrefetch hook", () => {
  it("when audioPrefetchCount <= 0, hook does not set src on warmer", () => {
    usePreferencesStore.setState({ audioPrefetchCount: 0 });
    const queue = makeQueue(3);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));

    expect(el.src).toBe("");
    expect(el.load).not.toHaveBeenCalled();
  });

  it("sets warmer.src to the next track url on mount", () => {
    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));

    expect(el.src).toBe(queue[1]!.audioUrl);
    expect(el.load).toHaveBeenCalledTimes(1);
  });

  it("calls load() when next URL changes on queue/currentIndex update", () => {
    const queue = makeQueue(5);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));
    expect(el.load).toHaveBeenCalledTimes(1);

    act(() => {
      usePlayerStore.setState({ currentIndex: 2 });
    });

    expect(el.src).toBe(queue[3]!.audioUrl);
    expect(el.load).toHaveBeenCalledTimes(2);
  });

  it("clears warmer.src when there are no following tracks", () => {
    const queue = makeQueue(3);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));
    expect(el.src).toBe(queue[1]!.audioUrl);

    act(() => {
      usePlayerStore.setState({ currentIndex: 2 });
    });

    expect(el.src).toBe("");
  });

  it("warmer never calls play()", () => {
    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));

    act(() => {
      usePlayerStore.setState({ currentIndex: 1 });
    });

    expect(el.play).not.toHaveBeenCalled();
  });
});
