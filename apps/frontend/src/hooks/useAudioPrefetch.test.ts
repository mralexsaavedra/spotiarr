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

  it("repeatMode=all non-shuffle 2-track: returns the other track (wrap bug)", () => {
    const queue = makeQueue(2);
    const result = computeNextAudioUrls(
      {
        queue,
        currentIndex: 0,
        shuffleMode: false,
        shuffleOrder: [],
        shuffleOrderIndex: -1,
        repeatMode: "all",
      },
      1,
    );
    expect(result).toEqual([queue[1]!.audioUrl]);
  });

  it("repeatMode=all shuffle 2-track: returns the other track (wrap bug)", () => {
    const queue = makeQueue(2);
    const result = computeNextAudioUrls(
      {
        queue,
        currentIndex: 0,
        shuffleMode: true,
        shuffleOrder: [0, 1],
        shuffleOrderIndex: 0,
        repeatMode: "all",
      },
      1,
    );
    expect(result).toEqual([queue[1]!.audioUrl]);
  });

  it("repeatMode=all: wrap that lands on currentUrl is skipped, next valid takes its place", () => {
    const queue = makeQueue(3);
    const customQueue = [...queue];
    customQueue[0] = { ...customQueue[0]!, audioUrl: "http://localhost/same.mp3" };
    customQueue[2] = { ...customQueue[2]!, audioUrl: "http://localhost/same.mp3" };
    const result = computeNextAudioUrls(
      {
        queue: customQueue,
        currentIndex: 2,
        shuffleMode: false,
        shuffleOrder: [],
        shuffleOrderIndex: -1,
        repeatMode: "all",
      },
      2,
    );
    expect(result).toEqual([customQueue[1]!.audioUrl]);
    expect(result).not.toContain("http://localhost/same.mp3");
  });
});

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

  it("count 3→0: clears warmer.src instead of leaving old buffer active", () => {
    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));
    expect(el.src).toBe(queue[1]!.audioUrl);

    act(() => {
      usePreferencesStore.setState({ audioPrefetchCount: 0 });
    });

    expect(el.src).toBe("");
  });

  it("count 3→0→3: re-warms after being re-enabled", () => {
    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });

    const el = makeMockAudioElement();
    const warmerRef = makeWarmerRef(el);

    renderHook(() => useAudioPrefetch(warmerRef));
    expect(el.src).toBe(queue[1]!.audioUrl);

    act(() => {
      usePreferencesStore.setState({ audioPrefetchCount: 0 });
    });
    expect(el.src).toBe("");

    act(() => {
      usePreferencesStore.setState({ audioPrefetchCount: 3 });
    });

    expect(el.src).toBe(queue[1]!.audioUrl);
    expect(el.load).toHaveBeenCalledTimes(2);
  });
});

describe("useAudioPrefetch — Cache-API fetch path (Slice 2)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    Object.defineProperty(window, "isSecureContext", {
      value: true,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true, writable: true });
    if (!("serviceWorker" in navigator)) {
      Object.defineProperty(navigator, "serviceWorker", {
        value: {},
        configurable: true,
        writable: true,
      });
    }
  });

  afterEach(() => {
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
      writable: true,
    });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("no fetch when isSecureContext is false", () => {
    Object.defineProperty(window, "isSecureContext", {
      value: false,
      configurable: true,
      writable: true,
    });

    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 3 });

    const el = makeMockAudioElement();
    renderHook(() => useAudioPrefetch({ current: el }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no fetch when navigator.onLine is false", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
      writable: true,
    });

    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 3 });

    const el = makeMockAudioElement();
    renderHook(() => useAudioPrefetch({ current: el }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches next N urls sequentially with credentials:include when secure and online", async () => {
    const queue = makeQueue(5);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 3 });

    const el = makeMockAudioElement();
    renderHook(() => useAudioPrefetch({ current: el }));

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(fetchSpy).toHaveBeenNthCalledWith(1, queue[1]!.audioUrl, {
      credentials: "include",
    });
    expect(fetchSpy).toHaveBeenNthCalledWith(2, queue[2]!.audioUrl, {
      credentials: "include",
    });
    expect(fetchSpy).toHaveBeenNthCalledWith(3, queue[3]!.audioUrl, {
      credentials: "include",
    });
  });

  it("fetch does not include Range header", async () => {
    const queue = makeQueue(3);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 2 });

    const el = makeMockAudioElement();
    renderHook(() => useAudioPrefetch({ current: el }));

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const calls = fetchSpy.mock.calls as [string, RequestInit][];
    for (const [, opts] of calls) {
      const headers = opts?.headers as Record<string, string> | undefined;
      expect(headers?.["Range"]).toBeUndefined();
      expect(headers?.["range"]).toBeUndefined();
    }
  });

  it("QuotaExceededError is swallowed — no unhandled rejection", async () => {
    const err = new DOMException("QuotaExceededError");
    fetchSpy.mockRejectedValueOnce(err);

    const queue = makeQueue(3);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 1 });

    const el = makeMockAudioElement();

    await expect(
      act(async () => {
        renderHook(() => useAudioPrefetch({ current: el }));
        for (let i = 0; i < 10; i++) await Promise.resolve();
      }),
    ).resolves.not.toThrow();
  });

  it("network error is swallowed — no unhandled rejection", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const queue = makeQueue(3);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 1 });

    const el = makeMockAudioElement();

    await expect(
      act(async () => {
        renderHook(() => useAudioPrefetch({ current: el }));
        for (let i = 0; i < 10; i++) await Promise.resolve();
      }),
    ).resolves.not.toThrow();
  });

  it("N=0 in secure context: no fetch", async () => {
    const queue = makeQueue(4);
    usePlayerStore.setState({ queue, currentIndex: 0 });
    usePreferencesStore.setState({ audioPrefetchCount: 0 });

    const el = makeMockAudioElement();
    renderHook(() => useAudioPrefetch({ current: el }));

    await act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
