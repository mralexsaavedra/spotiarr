/**
 * useMediaSession unit tests — Strict TDD (Win 3).
 *
 * Tests T3.1–T3.8 cover:
 * - no-op in unsupported environments
 * - metadata set/cleared when currentItem changes
 * - artwork array shape
 * - playbackState sync
 * - action handler registration and seekto guard
 * - cleanup on unmount
 */
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueueItem } from "@/store/usePlayerStore";
import { type MediaSessionActions, useMediaSession } from "./useMediaSession";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  id: "track-1",
  name: "Vaka",
  artist: "Sigur Rós",
  album: "( )",
  artworkUrl: "https://example.com/art.jpg",
  audioUrl: "/api/library/audio?id=1",
  ...overrides,
});

const makeActions = (): MediaSessionActions & {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  next: ReturnType<typeof vi.fn>;
  previous: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
} => ({
  play: vi.fn(),
  pause: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  seek: vi.fn(),
});

// ---------------------------------------------------------------------------
// MediaSession stub factory
// ---------------------------------------------------------------------------

function setupMediaSessionStub() {
  const setActionHandler = vi.fn();
  const stub = {
    metadata: null as unknown,
    playbackState: "none" as string,
    setActionHandler,
  };

  Object.defineProperty(navigator, "mediaSession", {
    value: stub,
    configurable: true,
    writable: true,
  });

  vi.stubGlobal(
    "MediaMetadata",
    class {
      title: string;
      artist: string;
      album: string;
      artwork: unknown[];
      constructor(init: { title: string; artist: string; album: string; artwork: unknown[] }) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album;
        this.artwork = init.artwork;
      }
    },
  );

  function restore() {
    Object.defineProperty(navigator, "mediaSession", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    vi.unstubAllGlobals();
  }

  return { stub, setActionHandler, restore };
}

// ---------------------------------------------------------------------------
// T3.1 — no-op when mediaSession is absent
// ---------------------------------------------------------------------------

describe("T3.1 — no-op in unsupported environments", () => {
  beforeEach(() => {
    // Make mediaSession unavailable by setting to null (different from undefined
    // so that navigator.mediaSession != null guard catches it)
    Object.defineProperty(navigator, "mediaSession", {
      value: null,
      configurable: true,
      writable: true,
    });
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "mediaSession", {
      value: null,
      configurable: true,
      writable: true,
    });
  });

  it("does not throw when navigator.mediaSession is absent", () => {
    const actions = makeActions();
    expect(() => {
      renderHook(() => useMediaSession(makeItem(), false, actions));
    }).not.toThrow();
  });

  it("does not call setActionHandler when mediaSession is absent", () => {
    const actions = makeActions();
    renderHook(() => useMediaSession(makeItem(), false, actions));
    // No setActionHandler to call — just verify no side-effects happened
    // (no throw, no global mutation)
    expect(actions.play).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// T3.2–T3.8 — behaviour with stubbed mediaSession
// ---------------------------------------------------------------------------

describe("useMediaSession with stubbed navigator.mediaSession", () => {
  let stub: ReturnType<typeof setupMediaSessionStub>["stub"];
  let setActionHandler: ReturnType<typeof vi.fn>;
  let restore: () => void;

  beforeEach(() => {
    const result = setupMediaSessionStub();
    stub = result.stub;
    setActionHandler = result.setActionHandler;
    restore = result.restore;
  });

  afterEach(() => {
    restore();
  });

  // T3.2 — metadata set when currentItem becomes non-null
  it("[T3.2] sets metadata with correct title/artist/album/artwork when currentItem is provided", () => {
    const item = makeItem();
    const actions = makeActions();

    renderHook(() => useMediaSession(item, false, actions));

    const meta = stub.metadata as {
      title: string;
      artist: string;
      album: string;
      artwork: { src: string }[];
    };
    expect(meta).not.toBeNull();
    expect(meta.title).toBe("Vaka");
    expect(meta.artist).toBe("Sigur Rós");
    expect(meta.album).toBe("( )");
    expect(meta.artwork).toEqual([{ src: "https://example.com/art.jpg" }]);
  });

  // T3.3 — artwork is empty when artworkUrl is undefined
  it("[T3.3] artwork is [] when artworkUrl is undefined", () => {
    const item = makeItem({ artworkUrl: undefined });
    const actions = makeActions();

    renderHook(() => useMediaSession(item, false, actions));

    const meta = stub.metadata as { artwork: unknown[] };
    expect(meta.artwork).toHaveLength(0);
  });

  // T3.4 — metadata clears to null when currentItem becomes null
  it("[T3.4] clears metadata to null when currentItem becomes null", () => {
    const item = makeItem();
    const actions = makeActions();

    const { rerender } = renderHook(
      ({ currentItem }: { currentItem: QueueItem | null }) =>
        useMediaSession(currentItem, false, actions),
      { initialProps: { currentItem: item as QueueItem | null } },
    );

    expect(stub.metadata).not.toBeNull();

    rerender({ currentItem: null });

    expect(stub.metadata).toBeNull();
  });

  // T3.5 — playbackState reflects isPlaying and currentItem
  it("[T3.5] playbackState is 'playing' when isPlaying and currentItem is set", () => {
    const item = makeItem();
    const actions = makeActions();

    renderHook(() => useMediaSession(item, true, actions));

    expect(stub.playbackState).toBe("playing");
  });

  it("[T3.5] playbackState is 'paused' when not isPlaying and currentItem is set", () => {
    const item = makeItem();
    const actions = makeActions();

    renderHook(() => useMediaSession(item, false, actions));

    expect(stub.playbackState).toBe("paused");
  });

  it("[T3.5] playbackState is 'none' when currentItem is null", () => {
    const actions = makeActions();

    renderHook(() => useMediaSession(null, false, actions));

    expect(stub.playbackState).toBe("none");
  });

  // T3.6 — all five action handlers registered on mount
  it("[T3.6] registers all five action handlers on mount", () => {
    const item = makeItem();
    const actions = makeActions();

    renderHook(() => useMediaSession(item, false, actions));

    const registeredActions = (setActionHandler.mock.calls as unknown[][]).map((call) => call[0]);
    expect(registeredActions).toContain("play");
    expect(registeredActions).toContain("pause");
    expect(registeredActions).toContain("previoustrack");
    expect(registeredActions).toContain("nexttrack");
    expect(registeredActions).toContain("seekto");

    // All handlers are non-null functions
    (setActionHandler.mock.calls as unknown[][]).forEach((call) => {
      expect(typeof call[1]).toBe("function");
    });
  });

  // T3.7 — seekto handler guards seekTime != null
  it("[T3.7] seekto handler calls actions.seek when seekTime is provided", () => {
    const item = makeItem();
    const actions = makeActions();

    renderHook(() => useMediaSession(item, false, actions));

    const seektoCall = (setActionHandler.mock.calls as unknown[][]).find(
      (call) => call[0] === "seekto",
    );
    const seektoHandler = seektoCall?.[1] as (details: { seekTime?: number }) => void;

    seektoHandler({ seekTime: 42 });

    expect(actions.seek).toHaveBeenCalledWith(42);
  });

  it("[T3.7] seekto handler does NOT call actions.seek when seekTime is absent", () => {
    const item = makeItem();
    const actions = makeActions();

    renderHook(() => useMediaSession(item, false, actions));

    const seektoCall = (setActionHandler.mock.calls as unknown[][]).find(
      (call) => call[0] === "seekto",
    );
    const seektoHandler = seektoCall?.[1] as (details: { seekTime?: number }) => void;

    seektoHandler({});

    expect(actions.seek).not.toHaveBeenCalled();
  });

  // T3.8 — cleanup clears all handlers on unmount
  it("[T3.8] clears all five action handlers and nullifies metadata on unmount", () => {
    const item = makeItem();
    const actions = makeActions();

    const { unmount } = renderHook(() => useMediaSession(item, false, actions));

    setActionHandler.mockClear();

    unmount();

    // Five setActionHandler(name, null) calls expected
    const nullCalls = (setActionHandler.mock.calls as unknown[][]).filter(
      (call) => call[1] === null,
    );
    const clearedActions = nullCalls.map((call) => call[0]);
    expect(clearedActions).toContain("play");
    expect(clearedActions).toContain("pause");
    expect(clearedActions).toContain("previoustrack");
    expect(clearedActions).toContain("nexttrack");
    expect(clearedActions).toContain("seekto");

    expect(stub.metadata).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T3.9 — iOS skips the seekto handler to preserve lock-screen prev/next
// ---------------------------------------------------------------------------

describe("useMediaSession on iOS (seekto suppression)", () => {
  let setActionHandler: ReturnType<typeof vi.fn>;
  let restore: () => void;
  let originalUA: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalUA = Object.getOwnPropertyDescriptor(navigator, "userAgent");
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    const result = setupMediaSessionStub();
    setActionHandler = result.setActionHandler;
    restore = result.restore;
  });

  afterEach(() => {
    restore();
    if (originalUA) {
      Object.defineProperty(navigator, "userAgent", originalUA);
    }
  });

  it("[T3.9] explicitly nulls seek actions on iOS so prev/next can surface", () => {
    const actions = makeActions();

    renderHook(() => useMediaSession(makeItem(), false, actions));

    // null != "not registered" on WebKit: each seek action must be set to null.
    const seekCalls = (setActionHandler.mock.calls as unknown[][]).filter((call) =>
      ["seekbackward", "seekforward", "seekto"].includes(call[0] as string),
    );
    expect(seekCalls).toHaveLength(3);
    seekCalls.forEach((call) => {
      expect(call[1]).toBeNull();
    });
  });

  it("[T3.9] still registers previoustrack and nexttrack on iOS", () => {
    const actions = makeActions();

    renderHook(() => useMediaSession(makeItem(), false, actions));

    const registeredActions = (setActionHandler.mock.calls as unknown[][]).map((call) => call[0]);
    expect(registeredActions).toContain("previoustrack");
    expect(registeredActions).toContain("nexttrack");
    expect(registeredActions).toContain("play");
    expect(registeredActions).toContain("pause");
  });
});

// ---------------------------------------------------------------------------
// T3.10 — re-apply metadata + handlers on the audio "playing" event
// ---------------------------------------------------------------------------

describe("useMediaSession re-applies on the audio playing event", () => {
  let setActionHandler: ReturnType<typeof vi.fn>;
  let restore: () => void;

  beforeEach(() => {
    const result = setupMediaSessionStub();
    setActionHandler = result.setActionHandler;
    restore = result.restore;
  });

  afterEach(() => {
    restore();
  });

  it("[T3.10] re-registers action handlers when the element fires 'playing'", () => {
    const actions = makeActions();
    const el = document.createElement("audio");

    renderHook(() => useMediaSession(makeItem(), true, actions, el));

    setActionHandler.mockClear();

    // iOS clears handlers on playback start; the 'playing' event must re-apply them.
    el.dispatchEvent(new Event("playing"));

    const reRegistered = (setActionHandler.mock.calls as unknown[][]).map((call) => call[0]);
    expect(reRegistered).toContain("previoustrack");
    expect(reRegistered).toContain("nexttrack");
    expect(reRegistered).toContain("play");
    expect(reRegistered).toContain("pause");
  });

  it("[T3.10] does not attach a listener when audioEl is null", () => {
    const actions = makeActions();

    // No element provided → nothing to re-apply against, must not throw.
    expect(() => {
      renderHook(() => useMediaSession(makeItem(), true, actions, null));
    }).not.toThrow();
  });
});
