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
