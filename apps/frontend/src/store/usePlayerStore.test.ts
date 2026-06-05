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
  // Reset to initial state before each test
  usePlayerStore.getState().clear();
  // Also reset volume/isMuted to defaults (clear preserves them, so set explicitly)
  usePlayerStore.setState({ volume: 1, isMuted: false, error: null });
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
// persist partialize: only volume and isMuted survive
// ---------------------------------------------------------------------------

describe("persist partialize", () => {
  it("only serializes volume and isMuted", async () => {
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
      playQueue: vi.fn(),
      togglePlay: vi.fn(),
      next: vi.fn(),
      prev: vi.fn(),
      seek: vi.fn(),
      setVolume: vi.fn(),
      toggleMute: vi.fn(),
      clear: vi.fn(),
      setAudioElement: vi.fn(),
      _onLoadedMetadata: vi.fn(),
      _onTimeUpdate: vi.fn(),
      _onEnded: vi.fn(),
      _onError: vi.fn(),
    };

    const persisted = partialize(state as unknown as Parameters<typeof partialize>[0]);
    const roundTripped = JSON.parse(JSON.stringify(persisted));

    expect(roundTripped).toEqual({ volume: 0.6, isMuted: true });
    expect("queue" in roundTripped).toBe(false);
    expect("currentTime" in roundTripped).toBe(false);
    expect("isPlaying" in roundTripped).toBe(false);
  });
});
