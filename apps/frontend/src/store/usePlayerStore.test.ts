/**
 * usePlayerStore unit tests — Strict TDD (RED phase authored first).
 *
 * These tests cover every action and internal reducer as per the design spec.
 * REQ-PLAYER-BAR-002, 003, 004, 007, 011, 012.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// We import the store lazily after each reset to avoid cross-test state pollution.
// Zustand stores are module-level singletons, so we reset state via the store's
// own reset mechanism in beforeEach.

let usePlayerStore: typeof import("./usePlayerStore").usePlayerStore;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./usePlayerStore");
  usePlayerStore = mod.usePlayerStore;
  usePlayerStore.getState().clear();
  usePlayerStore.setState({
    volume: 1,
    isMuted: false,
    error: null,
    shuffleMode: false,
    repeatMode: "off",
    shuffleOrder: [],
    shuffleOrderIndex: -1,
  });
});

const makeItem = (id: string, audioUrl = `/api/library/audio?id=${id}`) => ({
  id,
  name: `Track ${id}`,
  artist: "Artist",
  audioUrl,
  durationMs: 180_000,
});

// ---------------------------------------------------------------------------
// playQueue
// ---------------------------------------------------------------------------

describe("playQueue", () => {
  it("sets queue, currentIndex, isPlaying=true, currentTime=0", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);

    const state = usePlayerStore.getState();
    expect(state.queue).toEqual(items);
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(0);
    expect(state.error).toBeNull();
  });

  it("calls clear() when items array is empty", () => {
    const items = [makeItem("a")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.getState().playQueue([], 0);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(0);
    expect(state.currentIndex).toBeNull();
    expect(state.isPlaying).toBe(false);
  });

  it("calls clear() when startIndex is out of range", () => {
    const items = [makeItem("a")];
    usePlayerStore.getState().playQueue(items, 5);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(0);
    expect(state.currentIndex).toBeNull();
  });

  it("clears any existing error on new playQueue call", () => {
    usePlayerStore.setState({ error: "previous error" });
    usePlayerStore.getState().playQueue([makeItem("a")], 0);

    expect(usePlayerStore.getState().error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// togglePlay
// ---------------------------------------------------------------------------

describe("togglePlay", () => {
  it("is a no-op when currentIndex is null", () => {
    usePlayerStore.getState().togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it("flips isPlaying from false to true", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isPlaying: false });

    usePlayerStore.getState().togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("flips isPlaying from true to false", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().togglePlay();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// next
// ---------------------------------------------------------------------------

describe("next", () => {
  it("advances currentIndex when not at last track", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.getState().next();

    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("resets currentTime to 0 when advancing", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ currentTime: 45 });
    usePlayerStore.getState().next();

    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it("is a no-op at last index (does NOT wrap or clear)", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.queue).toHaveLength(2);
  });

  it("keeps isPlaying state when advancing", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().next();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// prev
// ---------------------------------------------------------------------------

describe("prev", () => {
  it("decrements currentIndex when not at first track", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("resets currentTime to 0 when going to previous", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ currentTime: 60 });
    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it("is a no-op at first index (does NOT wrap)", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it("keeps isPlaying state when going previous", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState().prev();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("seeks to 0 and does not change currentIndex when currentTime > 3", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({ currentTime: 5, duration: 200 });
    const wasPlaying = usePlayerStore.getState().isPlaying;

    usePlayerStore.getState().prev();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(2);
    expect(state.currentTime).toBe(0);
    expect(state.isPlaying).toBe(wasPlaying);
  });

  it("decrements currentIndex when currentTime <= 3", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({ currentTime: 3, duration: 200 });

    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("stays at index 0 when currentTime <= 3 and already at first track", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ currentTime: 2, duration: 200 });

    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// seek
// ---------------------------------------------------------------------------

describe("seek", () => {
  it("sets currentTime to the requested value", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ duration: 200 });
    usePlayerStore.getState().seek(90);

    expect(usePlayerStore.getState().currentTime).toBe(90);
  });

  it("clamps to 0 when given a negative value", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ duration: 200 });
    usePlayerStore.getState().seek(-10);

    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it("clamps to duration when value exceeds duration", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ duration: 200 });
    usePlayerStore.getState().seek(999);

    expect(usePlayerStore.getState().currentTime).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// setVolume
// ---------------------------------------------------------------------------

describe("setVolume", () => {
  it("sets volume within [0, 1] range", () => {
    usePlayerStore.getState().setVolume(0.5);
    expect(usePlayerStore.getState().volume).toBe(0.5);
  });

  it("clamps to 0 when given a negative value", () => {
    usePlayerStore.getState().setVolume(-0.5);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it("clamps to 1 when given a value above 1", () => {
    usePlayerStore.getState().setVolume(2);
    expect(usePlayerStore.getState().volume).toBe(1);
  });

  it("does not change isMuted", () => {
    usePlayerStore.setState({ isMuted: true });
    usePlayerStore.getState().setVolume(0.7);

    expect(usePlayerStore.getState().isMuted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// toggleMute
// ---------------------------------------------------------------------------

describe("toggleMute", () => {
  it("flips isMuted from false to true", () => {
    usePlayerStore.setState({ isMuted: false });
    usePlayerStore.getState().toggleMute();

    expect(usePlayerStore.getState().isMuted).toBe(true);
  });

  it("flips isMuted from true to false", () => {
    usePlayerStore.setState({ isMuted: true });
    usePlayerStore.getState().toggleMute();

    expect(usePlayerStore.getState().isMuted).toBe(false);
  });

  it("does not change volume when toggling mute", () => {
    usePlayerStore.setState({ volume: 0.7, isMuted: false });
    usePlayerStore.getState().toggleMute();

    expect(usePlayerStore.getState().volume).toBe(0.7);

    usePlayerStore.getState().toggleMute();
    expect(usePlayerStore.getState().volume).toBe(0.7);
  });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe("clear", () => {
  it("resets queue, currentIndex, isPlaying, currentTime, duration, error", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ currentTime: 30, duration: 200, error: "oops" });
    usePlayerStore.getState().clear();

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(0);
    expect(state.currentIndex).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.currentTime).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.error).toBeNull();
  });

  it("preserves volume and isMuted after clear", () => {
    usePlayerStore.setState({ volume: 0.4, isMuted: true });
    usePlayerStore.getState().clear();

    const state = usePlayerStore.getState();
    expect(state.volume).toBe(0.4);
    expect(state.isMuted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Internal reducers: _onLoadedMetadata, _onTimeUpdate, _onEnded, _onError
// ---------------------------------------------------------------------------

describe("_onLoadedMetadata", () => {
  it("sets duration", () => {
    usePlayerStore.getState()._onLoadedMetadata(240);
    expect(usePlayerStore.getState().duration).toBe(240);
  });
});

describe("_onTimeUpdate", () => {
  it("updates currentTime", () => {
    usePlayerStore.getState()._onTimeUpdate(42);
    expect(usePlayerStore.getState().currentTime).toBe(42);
  });
});

describe("_onEnded", () => {
  it("calls next and keeps isPlaying true when not at last track", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.getState()._onEnded();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
  });

  it("sets isPlaying=false at boundary (last track ended, next is no-op)", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState()._onEnded();

    // next() is a no-op at last index — the store must explicitly set isPlaying=false
    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });
});

describe("_onError", () => {
  it("sets error and pauses playback", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.getState()._onError("Network error");

    const state = usePlayerStore.getState();
    expect(state.error).toBe("Network error");
    expect(state.isPlaying).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// persist partialize: only volume, isMuted, shuffleMode, repeatMode survive
// ---------------------------------------------------------------------------

describe("persist partialize", () => {
  it("serializes volume, isMuted, shuffleMode, repeatMode", async () => {
    const mod = await import("./usePlayerStore");
    const partialize = mod.__partialize;

    const state = {
      queue: [makeItem("a")],
      currentIndex: 0,
      isPlaying: true,
      volume: 0.6,
      isMuted: true,
      currentTime: 55,
      duration: 200,
      error: null,
      shuffleMode: true,
      repeatMode: "one" as const,
      shuffleOrder: [2, 0, 1],
      shuffleOrderIndex: 1,
      playQueue: vi.fn(),
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seek: vi.fn(),
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
      clear: vi.fn(),
      toggleShuffle: vi.fn(),
      cycleRepeat: vi.fn(),
      setAudioElement: vi.fn(),
      _onLoadedMetadata: vi.fn(),
      _onTimeUpdate: vi.fn(),
      _onEnded: vi.fn(),
      _onError: vi.fn(),
    };

    const persisted = partialize(state as unknown as Parameters<typeof partialize>[0]);
    const roundTripped = JSON.parse(JSON.stringify(persisted));

    expect(roundTripped).toEqual({
      volume: 0.6,
      isMuted: true,
      shuffleMode: true,
      repeatMode: "one",
    });
    expect("queue" in roundTripped).toBe(false);
    expect("currentTime" in roundTripped).toBe(false);
    expect("isPlaying" in roundTripped).toBe(false);
    expect("shuffleOrder" in roundTripped).toBe(false);
    expect("shuffleOrderIndex" in roundTripped).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// __partialize allowlist regression (REQ-5)
// ---------------------------------------------------------------------------

describe("__partialize allowlist — persisted keys are exactly volume, isMuted, shuffleMode, repeatMode", () => {
  it("result keys are exactly the 4 approved keys", async () => {
    const { __partialize: p } = await import("./usePlayerStore");
    const fullState = {
      queue: [makeItem("a")],
      currentIndex: 0,
      isPlaying: true,
      volume: 0.8,
      isMuted: false,
      currentTime: 30,
      duration: 200,
      error: null,
      shuffleMode: true,
      repeatMode: "all" as const,
      shuffleOrder: [0],
      shuffleOrderIndex: 0,
      isQueuePanelOpen: true,
      isNowPlayingOpen: true,
      playQueue: vi.fn(),
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seek: vi.fn(),
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
      clear: vi.fn(),
      toggleShuffle: vi.fn(),
      cycleRepeat: vi.fn(),
      setAudioElement: vi.fn(),
      _onLoadedMetadata: vi.fn(),
      _onTimeUpdate: vi.fn(),
      _onEnded: vi.fn(),
      _onError: vi.fn(),
      setQueuePanelOpen: vi.fn(),
      setNowPlayingOpen: vi.fn(),
      playFromIndex: vi.fn(),
      reorderQueue: vi.fn(),
    };

    const result = p(fullState as unknown as Parameters<typeof p>[0]);
    expect(Object.keys(result).sort()).toEqual(["isMuted", "repeatMode", "shuffleMode", "volume"]);
  });

  it("excluded fields are absent from result", async () => {
    const { __partialize: p } = await import("./usePlayerStore");
    const fullState = {
      isNowPlayingOpen: true,
      isQueuePanelOpen: true,
      queue: [makeItem("a")],
      currentIndex: 0,
      volume: 1,
      isMuted: false,
      shuffleMode: false,
      repeatMode: "off" as const,
    } as unknown as Parameters<typeof p>[0];

    const result = p(fullState);
    expect("isNowPlayingOpen" in result).toBe(false);
    expect("isQueuePanelOpen" in result).toBe(false);
    expect("queue" in result).toBe(false);
    expect("currentIndex" in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shuffle state (S1-1, S1-3, S1-4, S5-1, S5-2)
// ---------------------------------------------------------------------------

describe("shuffle state", () => {
  it("S1-1: initial defaults", () => {
    const state = usePlayerStore.getState();
    expect(state.shuffleMode).toBe(false);
    expect(state.repeatMode).toBe("off");
    expect(state.shuffleOrder).toEqual([]);
    expect(state.shuffleOrderIndex).toBe(-1);
  });

  it("S1-3: toggleShuffle on builds order with currentIndex pinned at position 0", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.shuffleMode).toBe(true);
    expect(state.shuffleOrder).toHaveLength(5);
    expect(state.shuffleOrder[0]).toBe(2);
    expect(state.shuffleOrderIndex).toBe(0);
  });

  it("S1-4: toggleShuffle off clears order and leaves currentIndex unchanged", () => {
    usePlayerStore.setState({
      shuffleMode: true,
      shuffleOrder: [2, 0, 4, 1, 3],
      shuffleOrderIndex: 2,
      currentIndex: 4,
    });
    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.shuffleMode).toBe(false);
    expect(state.shuffleOrder).toEqual([]);
    expect(state.shuffleOrderIndex).toBe(-1);
    expect(state.currentIndex).toBe(4);
  });

  it("S5-1: toggle on mid-queue pins current and discards old history", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({ shuffleOrder: [0, 3, 2, 1], shuffleOrderIndex: 2 });
    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.shuffleOrder[0]).toBe(2);
    expect(state.shuffleOrderIndex).toBe(0);
  });

  it("S5-2: toggle off leaves currentIndex intact", () => {
    usePlayerStore.setState({
      shuffleMode: true,
      currentIndex: 3,
      shuffleOrder: [3, 1, 0, 2],
      shuffleOrderIndex: 0,
    });
    usePlayerStore.getState().toggleShuffle();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(3);
    expect(state.shuffleOrder).toEqual([]);
    expect(state.shuffleOrderIndex).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// repeat state (S1-5, S5-3)
// ---------------------------------------------------------------------------

describe("repeat state", () => {
  it("S1-5: cycleRepeat rotates off → all → one → off", () => {
    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeatMode).toBe("all");

    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeatMode).toBe("one");

    usePlayerStore.getState().cycleRepeat();
    expect(usePlayerStore.getState().repeatMode).toBe("off");
  });

  it("S5-3: cycleRepeat does not touch audio state", () => {
    usePlayerStore.setState({
      isPlaying: true,
      currentTime: 42,
      currentIndex: 1,
      repeatMode: "off",
    });
    usePlayerStore.getState().cycleRepeat();

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(42);
    expect(state.currentIndex).toBe(1);
    expect(state.repeatMode).toBe("all");
  });
});

// ---------------------------------------------------------------------------
// partialize — S1-6 rehydration
// ---------------------------------------------------------------------------

describe("partialize S1-6", () => {
  it("shuffleOrder and shuffleOrderIndex reset to defaults on rehydration", async () => {
    const { __partialize: p } = await import("./usePlayerStore");
    const fakeState = {
      shuffleMode: true,
      repeatMode: "one" as const,
      shuffleOrder: [2, 0, 1],
      shuffleOrderIndex: 1,
      volume: 1,
      isMuted: false,
    } as unknown as Parameters<typeof p>[0];

    const persisted = p(fakeState);
    expect("shuffleOrder" in persisted).toBe(false);
    expect("shuffleOrderIndex" in persisted).toBe(false);
    expect(persisted.shuffleMode).toBe(true);
    expect(persisted.repeatMode).toBe("one");
  });
});

// ---------------------------------------------------------------------------
// next() with modes (S2-1 to S2-6)
// ---------------------------------------------------------------------------

describe("next() with modes", () => {
  it("S2-1: stops at last track with repeat off", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(2);
    expect(state.isPlaying).toBe(false);
  });

  it("S2-2: wraps to 0 with repeat all", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({ repeatMode: "all" });
    usePlayerStore.getState().next();

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it("S2-3: repeat-one still advances (user-triggered next)", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ repeatMode: "one" });
    usePlayerStore.getState().next();

    expect(usePlayerStore.getState().currentIndex).toBe(2);
  });

  it("S2-4: shuffle on advances shuffleOrderIndex and sets currentIndex", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({
      shuffleMode: true,
      shuffleOrder: [2, 0, 4, 1, 3],
      shuffleOrderIndex: 1,
    });
    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.shuffleOrderIndex).toBe(2);
    expect(state.currentIndex).toBe(4);
  });

  it("S2-5: shuffle wraps cursor with repeat all", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({
      shuffleMode: true,
      shuffleOrder: [2, 0, 4, 1, 3],
      shuffleOrderIndex: 4,
      repeatMode: "all",
    });
    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.shuffleOrderIndex).toBe(0);
    expect(state.currentIndex).toBe(2);
  });

  it("S2-6: shuffle stops at end with repeat off", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({
      shuffleMode: true,
      shuffleOrder: [2, 0, 4, 1, 3],
      shuffleOrderIndex: 4,
      repeatMode: "off",
    });
    usePlayerStore.getState().next();

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.shuffleOrderIndex).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// prev() with modes (S2-7, S2-8, Decision #10)
// ---------------------------------------------------------------------------

describe("prev() with modes", () => {
  it("S2-7: repeat all wraps at index 0", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ currentTime: 1, repeatMode: "all" });
    usePlayerStore.getState().prev();

    expect(usePlayerStore.getState().currentIndex).toBe(3);
  });

  it("S2-8: shuffle walks cursor back", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 4);
    usePlayerStore.setState({
      shuffleMode: true,
      shuffleOrder: [2, 0, 4],
      shuffleOrderIndex: 2,
      currentTime: 1,
      repeatMode: "off",
    });
    usePlayerStore.getState().prev();

    const state = usePlayerStore.getState();
    expect(state.shuffleOrderIndex).toBe(1);
    expect(state.currentIndex).toBe(0);
  });

  it("Decision #10: shuffle on + shuffleOrderIndex=0 + repeat off is a no-op", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({
      shuffleMode: true,
      shuffleOrder: [2, 0, 1],
      shuffleOrderIndex: 0,
      currentIndex: 2,
      currentTime: 1,
      repeatMode: "off",
    });
    usePlayerStore.getState().prev();

    const state = usePlayerStore.getState();
    expect(state.shuffleOrderIndex).toBe(0);
    expect(state.currentIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// _onEnded() with modes (S2-9 to S2-12)
// ---------------------------------------------------------------------------

describe("_onEnded() with modes", () => {
  it("S2-9: repeat one replays (seek 0 + play), does not advance", () => {
    const mockAudio = { currentTime: 5, play: vi.fn().mockResolvedValue(undefined) };
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ repeatMode: "one", isPlaying: true });
    usePlayerStore.getState().setAudioElement(mockAudio as unknown as HTMLAudioElement);

    usePlayerStore.getState()._onEnded();

    expect(mockAudio.currentTime).toBe(0);
    expect(mockAudio.play).toHaveBeenCalledOnce();
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("S2-10: repeat off at last track stops playback", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({ repeatMode: "off" });
    usePlayerStore.getState()._onEnded();

    expect(usePlayerStore.getState().isPlaying).toBe(false);
    expect(usePlayerStore.getState().currentIndex).toBe(2);
  });

  it("S2-11: single-track repeat one replays", () => {
    const mockAudio = { currentTime: 5, play: vi.fn().mockResolvedValue(undefined) };
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ repeatMode: "one", isPlaying: true });
    usePlayerStore.getState().setAudioElement(mockAudio as unknown as HTMLAudioElement);

    usePlayerStore.getState()._onEnded();

    expect(mockAudio.currentTime).toBe(0);
    expect(mockAudio.play).toHaveBeenCalledOnce();
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("S2-12: single-track repeat off stops", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ repeatMode: "off" });
    usePlayerStore.getState()._onEnded();

    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isQueuePanelOpen + setQueuePanelOpen (S1-1 through S1-6)
// ---------------------------------------------------------------------------

describe("isQueuePanelOpen", () => {
  it("S1-1: initial value is false", () => {
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(false);
  });

  it("S1-2: setQueuePanelOpen(true) sets flag to true", () => {
    usePlayerStore.getState().setQueuePanelOpen(true);
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(true);
  });

  it("S1-3: setQueuePanelOpen(false) sets flag to false", () => {
    usePlayerStore.getState().setQueuePanelOpen(true);
    usePlayerStore.getState().setQueuePanelOpen(false);
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(false);
  });

  it("S1-4: setQueuePanelOpen(true) when already true remains true (idempotent)", () => {
    usePlayerStore.getState().setQueuePanelOpen(true);
    usePlayerStore.getState().setQueuePanelOpen(true);
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(true);
  });

  it("S1-5: clear() resets isQueuePanelOpen to false", () => {
    usePlayerStore.getState().setQueuePanelOpen(true);
    usePlayerStore.getState().clear();
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(false);
  });

  it("S1-6: __partialize does NOT include isQueuePanelOpen in returned keys", async () => {
    const { __partialize: p } = await import("./usePlayerStore");
    const fakeState = {
      isQueuePanelOpen: true,
      volume: 1,
      isMuted: false,
      shuffleMode: false,
      repeatMode: "off" as const,
    } as unknown as Parameters<typeof p>[0];
    const persisted = p(fakeState);
    expect("isQueuePanelOpen" in persisted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// playFromIndex (S2-1 through S2-7)
// ---------------------------------------------------------------------------

describe("playFromIndex", () => {
  it("S2-1: happy path shuffle OFF — sets currentIndex, isPlaying=true, currentTime=0, shuffleOrder unchanged", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 0);
    const orderBefore = usePlayerStore.getState().shuffleOrder.slice();
    usePlayerStore.getState().playFromIndex(3);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(3);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(0);
    expect(state.shuffleOrder).toEqual(orderBefore);
  });

  it("S2-2: out-of-bounds negative is a no-op", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 2);
    const stateBefore = usePlayerStore.getState().currentIndex;
    usePlayerStore.getState().playFromIndex(-1);
    expect(usePlayerStore.getState().currentIndex).toBe(stateBefore);
  });

  it("S2-3: out-of-bounds equal to length is a no-op", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.getState().playFromIndex(5);
    expect(usePlayerStore.getState().currentIndex).toBe(2);
  });

  it("S2-4: empty queue is a no-op", () => {
    usePlayerStore.getState().playFromIndex(0);
    expect(usePlayerStore.getState().currentIndex).toBeNull();
  });

  it("S2-5: happy path shuffle ON — currentIndex set, shuffleOrder recomputed, shuffleOrderIndex=0", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c"), makeItem("d"), makeItem("e")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ shuffleMode: true });
    usePlayerStore.getState().playFromIndex(2);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(2);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(0);
    expect(state.shuffleOrder).toHaveLength(5);
    expect(state.shuffleOrder[0]).toBe(2);
    expect(state.shuffleOrderIndex).toBe(0);
  });

  it("S2-6: restart currently-playing — currentTime=0, isPlaying=true", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ currentTime: 45 });
    usePlayerStore.getState().playFromIndex(1);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(0);
  });

  it("S2-7: queue array reference unchanged after playFromIndex", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    const queueRef = usePlayerStore.getState().queue;
    usePlayerStore.getState().playFromIndex(0);
    expect(usePlayerStore.getState().queue).toBe(queueRef);
  });
});

// ---------------------------------------------------------------------------
// reorderQueue
// ---------------------------------------------------------------------------

describe("reorderQueue", () => {
  const makeQueue = () => [
    makeItem("a"),
    makeItem("b"),
    makeItem("c"),
    makeItem("d"),
    makeItem("e"),
  ];

  it("moves current track forward → currentIndex equals toIndex", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState().reorderQueue(1, 3);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(3);
    expect(state.queue[3]!.id).toBe("b");
  });

  it("moves current track backward → currentIndex equals toIndex", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 3);
    usePlayerStore.getState().reorderQueue(3, 1);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.queue[1]!.id).toBe("d");
  });

  it("moves track from before current to after current → currentIndex decreases by 1", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.getState().reorderQueue(0, 3);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.queue[1]!.id).toBe("c");
  });

  it("moves track from before current to exactly currentIndex → currentIndex decreases by 1", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.getState().reorderQueue(0, 2);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.queue[1]!.id).toBe("c");
  });

  it("moves track from after current to before current → currentIndex increases by 1", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState().reorderQueue(3, 0);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(2);
    expect(state.queue[2]!.id).toBe("b");
  });

  it("moves track from after current to exactly currentIndex → currentIndex increases by 1", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState().reorderQueue(3, 1);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(2);
    expect(state.queue[2]!.id).toBe("b");
  });

  it("moves track within before-current segment only → currentIndex unchanged", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 3);
    usePlayerStore.getState().reorderQueue(0, 1);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(3);
    expect(state.queue[3]!.id).toBe("d");
  });

  it("moves track within after-current segment only → currentIndex unchanged", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.getState().reorderQueue(3, 4);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.queue[1]!.id).toBe("b");
  });

  it("no-op when fromIndex equals toIndex → queue reference unchanged", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    const queueBefore = usePlayerStore.getState().queue;
    usePlayerStore.getState().reorderQueue(2, 2);

    expect(usePlayerStore.getState().queue).toBe(queueBefore);
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("no-op when fromIndex out of range → queue reference unchanged", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    const queueBefore = usePlayerStore.getState().queue;
    usePlayerStore.getState().reorderQueue(-1, 0);

    expect(usePlayerStore.getState().queue).toBe(queueBefore);
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("no-op when toIndex out of range → queue reference unchanged", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    const queueBefore = usePlayerStore.getState().queue;
    usePlayerStore.getState().reorderQueue(0, 10);

    expect(usePlayerStore.getState().queue).toBe(queueBefore);
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("shuffleMode true: shuffleOrder pinned at new currentIndex, shuffleOrderIndex reset to 0", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ shuffleMode: true });
    usePlayerStore.getState().reorderQueue(3, 0);

    const state = usePlayerStore.getState();
    expect(state.shuffleOrder).toHaveLength(5);
    expect(state.shuffleOrder[0]).toBe(state.currentIndex);
    expect(state.shuffleOrderIndex).toBe(0);
  });

  it("shuffleMode false: shuffleOrder untouched after reorder", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ shuffleOrder: [1, 3, 0, 4, 2], shuffleOrderIndex: 1 });
    const orderBefore = usePlayerStore.getState().shuffleOrder.slice();
    usePlayerStore.getState().reorderQueue(0, 3);

    const state = usePlayerStore.getState();
    expect(state.shuffleOrder).toEqual(orderBefore);
    expect(state.shuffleOrderIndex).toBe(1);
  });

  it("isPlaying, currentTime, duration unchanged after valid reorder", () => {
    const items = makeQueue();
    usePlayerStore.getState().playQueue(items, 2);
    usePlayerStore.setState({ currentTime: 42, duration: 200 });

    usePlayerStore.getState().reorderQueue(0, 4);

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.currentTime).toBe(42);
    expect(state.duration).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// isNowPlayingOpen + setNowPlayingOpen
// ---------------------------------------------------------------------------

describe("isNowPlayingOpen", () => {
  it("initial value is false", () => {
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("setNowPlayingOpen(true) sets flag to true", () => {
    usePlayerStore.getState().setNowPlayingOpen(true);
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(true);
  });

  it("setNowPlayingOpen(false) sets flag to false", () => {
    usePlayerStore.getState().setNowPlayingOpen(true);
    usePlayerStore.getState().setNowPlayingOpen(false);
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("clear() resets isNowPlayingOpen to false", () => {
    usePlayerStore.getState().setNowPlayingOpen(true);
    usePlayerStore.getState().clear();
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("__partialize does NOT include isNowPlayingOpen in returned keys", async () => {
    const { __partialize: p } = await import("./usePlayerStore");
    const fakeState = {
      isNowPlayingOpen: true,
      volume: 1,
      isMuted: false,
      shuffleMode: false,
      repeatMode: "off" as const,
    } as unknown as Parameters<typeof p>[0];
    const persisted = p(fakeState);
    expect("isNowPlayingOpen" in persisted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B4 — seek clamps to duration=0 before metadata loads
// ---------------------------------------------------------------------------

describe("seek — B4 pre-metadata clamp fix", () => {
  it("B4-1: seek(42) with duration=0 keeps requested value 42", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ duration: 0 });
    usePlayerStore.getState().seek(42);

    expect(usePlayerStore.getState().currentTime).toBe(42);
  });

  it("B4-2: seek(500) with duration=200 clamps to 200", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ duration: 200 });
    usePlayerStore.getState().seek(500);

    expect(usePlayerStore.getState().currentTime).toBe(200);
  });

  it("B4-3: seek(-5) clamps to 0 regardless of duration", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ duration: 0 });
    usePlayerStore.getState().seek(-5);

    expect(usePlayerStore.getState().currentTime).toBe(0);
  });

  it("B4-4: seek(42) with duration=0 sets _audioElement.currentTime to 42", () => {
    const mockAudio = { currentTime: 0 };
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.getState().setAudioElement(mockAudio as unknown as HTMLAudioElement);
    usePlayerStore.setState({ duration: 0 });
    usePlayerStore.getState().seek(42);

    expect(mockAudio.currentTime).toBe(42);
    usePlayerStore.getState().setAudioElement(null);
  });
});

// ---------------------------------------------------------------------------
// B6 — invalid duration stored verbatim
// ---------------------------------------------------------------------------

describe("_onLoadedMetadata — B6 invalid duration guard", () => {
  it("B6-1: NaN duration is stored as 0", () => {
    usePlayerStore.getState()._onLoadedMetadata(NaN);
    expect(usePlayerStore.getState().duration).toBe(0);
  });

  it("B6-2: Infinity duration is stored as 0", () => {
    usePlayerStore.getState()._onLoadedMetadata(Infinity);
    expect(usePlayerStore.getState().duration).toBe(0);
  });

  it("B6-3: valid duration 180 is stored as-is", () => {
    usePlayerStore.getState()._onLoadedMetadata(180);
    expect(usePlayerStore.getState().duration).toBe(180);
  });

  it("B6-4: zero duration is stored as 0", () => {
    usePlayerStore.getState()._onLoadedMetadata(0);
    expect(usePlayerStore.getState().duration).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// M5 — playFromIndex does not clear stale error
// ---------------------------------------------------------------------------

describe("playFromIndex — M5 stale error clear", () => {
  it("M5-1: playFromIndex clears a stale error", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ error: "previous error" });

    usePlayerStore.getState().playFromIndex(1);

    expect(usePlayerStore.getState().error).toBeNull();
    expect(usePlayerStore.getState().currentIndex).toBe(1);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// _onError auto-skip (E1-1 through E1-8)
// ---------------------------------------------------------------------------

describe("_onError auto-skip", () => {
  it("E1-1: error mid-queue advances to next track", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.getState()._onError("x");

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
    expect(state.consecutiveErrors).toBe(1);
    expect(state.error).toBe("x");
  });

  it("E1-2: every track fails stops queue with sticky error", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    // 3 errors for a 3-track queue: each advances, last one hits the ceiling
    usePlayerStore.getState()._onError("e1");
    usePlayerStore.getState()._onError("e2");
    usePlayerStore.getState()._onError("e3");

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.error).toBe("e3");
    expect(state.consecutiveErrors).toBe(0);
  });

  it("E1-3: single-track queue error is sticky", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.getState()._onError("fail");

    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.error).toBe("fail");
    expect(state.currentIndex).toBe(0);
    expect(state.consecutiveErrors).toBe(0);
  });

  it("E1-4: repeatMode one + error moves to next track", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ repeatMode: "one" });
    usePlayerStore.getState()._onError("err");

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.isPlaying).toBe(true);
  });

  it("E1-5: _onLoadedMetadata resets consecutiveErrors", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ consecutiveErrors: 2 });
    usePlayerStore.getState()._onLoadedMetadata(180);

    expect(usePlayerStore.getState().consecutiveErrors).toBe(0);
  });

  it("E1-6: playFromIndex resets consecutiveErrors", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ consecutiveErrors: 2 });
    usePlayerStore.getState().playFromIndex(1);

    expect(usePlayerStore.getState().consecutiveErrors).toBe(0);
  });

  it("E1-7: playQueue resets consecutiveErrors", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ consecutiveErrors: 2 });
    usePlayerStore.getState().playQueue([makeItem("b"), makeItem("c")], 0);

    expect(usePlayerStore.getState().consecutiveErrors).toBe(0);
  });

  it("E1-8: null currentIndex error sets error and stops without throw", () => {
    usePlayerStore.getState()._onError("no-track");

    const state = usePlayerStore.getState();
    expect(state.error).toBe("no-track");
    expect(state.isPlaying).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// playQueue() with shuffle (S3-1, S3-2)
// ---------------------------------------------------------------------------

describe("playQueue() with shuffle", () => {
  it("S3-1: rebuilds shuffleOrder when shuffle on, pins startIndex at 0", () => {
    usePlayerStore.setState({ shuffleMode: true });
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);

    const state = usePlayerStore.getState();
    expect(state.shuffleOrder).toHaveLength(3);
    expect(state.shuffleOrder[0]).toBe(1);
    expect(state.shuffleOrderIndex).toBe(0);
    expect(state.currentIndex).toBe(1);
  });

  it("S3-2: no shuffleOrder side effects when shuffle off", () => {
    usePlayerStore.setState({ shuffleMode: false });
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);

    const state = usePlayerStore.getState();
    expect(state.currentIndex).toBe(1);
    expect(state.shuffleOrder).toEqual([]);
    expect(state.shuffleOrderIndex).toBe(-1);
  });
});
