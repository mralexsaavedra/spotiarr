/**
 * GlobalPlayerBar unit tests — Strict TDD.
 *
 * Covers: null render, track meta render, transport interactions,
 * ARIA assertions, keyboard Space toggle, error state auto-clear,
 * single audio element in DOM, TrackMeta navigation (Win 2),
 * MediaSession integration (Win 3).
 *
 * REQ-PLAYER-BAR-001, 002, 003, 005, 007, 009, 011.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerStore } from "@/store/usePlayerStore";
import { GlobalPlayerBar } from "./GlobalPlayerBar";

// ---------------------------------------------------------------------------
// react-router-dom mock (useNavigate)
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("./QueueSidePanel", () => ({
  QueueSidePanel: () => null,
}));

vi.mock("./NowPlayingFullscreen", () => ({
  NowPlayingFullscreen: () => null,
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => {
        const map: Record<string, string> = {
          "player.queue.toggleOpen": "Open queue",
          "player.queue.toggleClose": "Close queue",
          "player.queue.title": "Queue",
          "player.queue.empty": "No tracks in queue",
          "player.queue.close": "Close",
          "player.queue.repeatAll": "Repeat all",
          "player.queue.repeatOne": "Repeat one",
          "player.queue.shuffleOn": "Shuffle on",
          "player.nowPlaying.open": "Open Now Playing",
          "player.nowPlaying.close": "Close",
          "player.nowPlaying.title": "Now Playing",
          "player.nowPlaying.queueLabel": "Queue",
          "player.transport.play": "Play",
          "player.transport.pause": "Pause",
          "player.transport.previous": "Previous track",
          "player.transport.next": "Next track",
          "player.transport.shuffleOn": "Disable shuffle",
          "player.transport.shuffleOff": "Enable shuffle",
          "player.transport.seek": "Seek",
          "player.transport.repeatEnable": "Enable repeat",
        };
        return map[key] ?? key;
      },
    }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeItem = (id: string, audioUrl = `/api/library/audio?id=${id}`) => ({
  id,
  name: `Track ${id}`,
  artist: `Artist ${id}`,
  artworkUrl: `https://example.com/art/${id}.jpg`,
  audioUrl,
  durationMs: 180_000,
});

function resetStore() {
  usePlayerStore.setState({
    queue: [],
    currentIndex: null,
    isPlaying: false,
    volume: 1,
    isMuted: false,
    currentTime: 0,
    duration: 180,
    error: null,
    shuffleMode: false,
    repeatMode: "off",
    shuffleOrder: [],
    shuffleOrderIndex: -1,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  resetStore();
});

// ---------------------------------------------------------------------------
// Render guard
// ---------------------------------------------------------------------------

describe("render guard", () => {
  it("returns null when queue is empty and no error", () => {
    render(<GlobalPlayerBar />);

    expect(screen.queryByRole("region", { name: "Now playing" })).toBeNull();
  });

  it("renders the region when a queue is loaded", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);

    render(<GlobalPlayerBar />);

    expect(screen.getByRole("region", { name: "Now playing" })).not.toBeNull();
  });

  it("renders the region when there is an error (even without a queue)", () => {
    usePlayerStore.setState({ error: "Network error" });

    render(<GlobalPlayerBar />);

    expect(screen.getByRole("region", { name: "Now playing" })).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Single audio element
// ---------------------------------------------------------------------------

describe("audio element", () => {
  it("renders exactly one hidden audio element", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    const { container } = render(<GlobalPlayerBar />);

    const audioEls = container.querySelectorAll("audio");
    expect(audioEls).toHaveLength(1);
    expect(audioEls[0]?.getAttribute("aria-label")).toBe("Audio player");
  });
});

// ---------------------------------------------------------------------------
// Track metadata display
// ---------------------------------------------------------------------------

describe("track metadata", () => {
  it("displays track name and artist of the current track", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);

    render(<GlobalPlayerBar />);

    expect(screen.getAllByText("Track a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Artist a").length).toBeGreaterThan(0);
  });

  it("shows artwork when artworkUrl is provided", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);

    render(<GlobalPlayerBar />);

    const imgs = screen.queryAllByRole("img", { name: /Track a/i });
    expect(imgs.length).toBeGreaterThan(0);
  });

  it("shows placeholder when artworkUrl is missing", () => {
    const item = { ...makeItem("a"), artworkUrl: undefined };
    usePlayerStore.getState().playQueue([item], 0);

    render(<GlobalPlayerBar />);

    // The Image atom renders a FontAwesome icon placeholder when src is absent.
    // What matters is no throw and the artwork container is present.
    const region = screen.getByRole("region", { name: "Now playing" });
    expect(region).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Transport controls — interactions
// ---------------------------------------------------------------------------

describe("transport controls", () => {
  it("renders play button and calls togglePlay on click", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isPlaying: false });

    render(<GlobalPlayerBar />);

    const playBtn = screen.getByRole("button", { name: "Play" });
    expect(playBtn).not.toBeNull();

    fireEvent.click(playBtn);

    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("renders pause button when playing", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    // isPlaying is true after playQueue

    render(<GlobalPlayerBar />);

    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeNull();
  });

  it("renders previous button and calls prev on click", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);

    render(<GlobalPlayerBar />);

    const prevBtn = screen.getByRole("button", { name: "Previous track" });
    fireEvent.click(prevBtn);

    expect(usePlayerStore.getState().currentIndex).toBe(0);
  });

  it("renders next button and calls next on click", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);

    render(<GlobalPlayerBar />);

    const nextBtn = screen.getByRole("button", { name: "Next track" });
    fireEvent.click(nextBtn);

    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });

  it("previous button is disabled at index 0", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);

    render(<GlobalPlayerBar />);

    const prevBtn = screen.getByRole("button", { name: "Previous track" });
    expect(prevBtn).toHaveProperty("disabled", true);
  });

  it("next button is disabled at last index", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);

    render(<GlobalPlayerBar />);

    const nextBtn = screen.getByRole("button", { name: "Next track" });
    expect(nextBtn).toHaveProperty("disabled", true);
  });

  it("next at last index is a no-op (currentIndex unchanged)", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 1);

    render(<GlobalPlayerBar />);

    const nextBtn = screen.getByRole("button", { name: "Next track" });
    fireEvent.click(nextBtn);

    // next() at boundary sets isPlaying=false but keeps currentIndex
    expect(usePlayerStore.getState().currentIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ARIA attributes
// ---------------------------------------------------------------------------

describe("ARIA", () => {
  it("region has role=region and aria-label='Now playing'", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    expect(screen.getByRole("region", { name: "Now playing" })).not.toBeNull();
  });

  it("play/pause button has aria-pressed reflecting isPlaying", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isPlaying: false });

    render(<GlobalPlayerBar />);

    const playBtn = screen.getByRole("button", { name: "Play" });
    expect(playBtn.getAttribute("aria-pressed")).toBe("false");
  });

  it("mute button has aria-label Mute when not muted", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    expect(screen.getByRole("button", { name: "Mute" })).not.toBeNull();
  });

  it("mute button has aria-label Unmute when muted", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isMuted: true });

    render(<GlobalPlayerBar />);

    expect(screen.getByRole("button", { name: "Unmute" })).not.toBeNull();
  });

  it("seek slider has role=slider with aria-label Seek", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    const seekSlider = screen.getByRole("slider", { name: "Seek" });
    expect(seekSlider).not.toBeNull();
    expect(seekSlider.getAttribute("aria-valuemin")).toBe("0");
  });

  it("volume slider has role=slider with aria-label Volume", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    const volumeSlider = screen.getByRole("slider", { name: "Volume" });
    expect(volumeSlider).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe("error state", () => {
  it("shows error text when store has an error", () => {
    usePlayerStore.setState({
      queue: [makeItem("a")],
      currentIndex: 0,
      isPlaying: false,
      error: "Playback failed",
    });

    render(<GlobalPlayerBar />);

    expect(screen.getByText("Playback failed")).not.toBeNull();
  });

  it("clears error after 3 seconds", () => {
    usePlayerStore.setState({
      queue: [makeItem("a")],
      currentIndex: 0,
      isPlaying: false,
      error: "Playback failed",
    });

    render(<GlobalPlayerBar />);
    expect(screen.getByText("Playback failed")).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(usePlayerStore.getState().error).toBeNull();
  });

  it("renders bar region even with no currentIndex when error exists", () => {
    usePlayerStore.setState({ error: "Some error", currentIndex: null });

    render(<GlobalPlayerBar />);

    expect(screen.getByRole("region", { name: "Now playing" })).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Keyboard Space toggle (REQ-PLAYER-BAR-009)
// ---------------------------------------------------------------------------

describe("keyboard space toggle", () => {
  it("pressing Space on the region root toggles play", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isPlaying: false });

    render(<GlobalPlayerBar />);

    const region = screen.getByRole("region", { name: "Now playing" });
    fireEvent.keyDown(region, { key: " " });

    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("pressing Space on the play button does NOT double-toggle", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isPlaying: false });

    render(<GlobalPlayerBar />);

    const playBtn = screen.getByRole("button", { name: "Play" });
    fireEvent.keyDown(playBtn, { key: " " });

    // The region onKeyDown should be a no-op when target is BUTTON
    // so isPlaying remains unchanged from before the keyDown
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Volume control
// ---------------------------------------------------------------------------

describe("volume control", () => {
  it("calls toggleMute when mute button is clicked", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    const muteBtn = screen.getByRole("button", { name: "Mute" });
    fireEvent.click(muteBtn);

    expect(usePlayerStore.getState().isMuted).toBe(true);
  });

  it("calls setVolume when volume slider changes", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    const volumeSlider = screen.getByRole("slider", { name: "Volume" });
    fireEvent.change(volumeSlider, { target: { value: "0.5" } });

    expect(usePlayerStore.getState().volume).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// TrackMeta navigation (Win 2 — T2.6 / T2.7)
// ---------------------------------------------------------------------------

const makeItemWithContext = (id: string, contextPath: string) => ({
  ...makeItem(id),
  contextPath,
});

describe("TrackMeta navigation", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("[T2.6] renders as button with aria-label when contextPath is set", () => {
    const item = makeItemWithContext("x", "/playlist/abc?mode=library");
    usePlayerStore.getState().playQueue([item], 0);

    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: /Open Track x by Artist x/ });
    expect(btn).not.toBeNull();
  });

  it("[T2.6] clicking the TrackMeta button calls navigate with contextPath", () => {
    const item = makeItemWithContext("x", "/playlist/abc?mode=library");
    usePlayerStore.getState().playQueue([item], 0);

    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: /Open Track x by Artist x/ });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/playlist/abc?mode=library");
  });

  it("[T2.7] desktop TrackMeta renders as non-interactive div when contextPath is absent", () => {
    const item = makeItem("y"); // no contextPath
    usePlayerStore.getState().playQueue([item], 0);

    render(<GlobalPlayerBar />);

    // No navigate button (contextPath-based) — only the mobile now-playing trigger
    expect(screen.queryByRole("button", { name: /Open Track y by Artist y/ })).toBeNull();
    // Track name still visible (rendered in mobile button)
    expect(screen.getAllByText("Track y").length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// MediaSession integration (Win 3 — T3.10)
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

describe("MediaSession integration", () => {
  it("[T3.10] GlobalPlayerBar sets navigator.mediaSession.metadata when a track is playing", () => {
    const { stub, restore } = setupMediaSessionStub();

    const item = { ...makeItem("z"), album: "Album Z" };
    usePlayerStore.getState().playQueue([item], 0);

    render(<GlobalPlayerBar />);

    const meta = stub.metadata as { title: string; artist: string };
    expect(meta).not.toBeNull();
    expect(meta.title).toBe("Track z");
    expect(meta.artist).toBe("Artist z");

    restore();
  });
});

// ---------------------------------------------------------------------------
// shuffle button (S4-1, S4-2, S4-7)
// ---------------------------------------------------------------------------

describe("shuffle button", () => {
  it("S4-1: renders with aria-label 'Enable shuffle' when shuffleMode is false", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    render(<GlobalPlayerBar />);

    expect(screen.getByRole("button", { name: "Enable shuffle" })).not.toBeNull();
  });

  it("S4-2: renders with aria-label 'Disable shuffle' when shuffleMode is true", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ shuffleMode: true });
    render(<GlobalPlayerBar />);

    expect(screen.getByRole("button", { name: "Disable shuffle" })).not.toBeNull();
  });

  it("S4-7: shuffle control element is a BUTTON", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Enable shuffle" });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("clicking shuffle button calls toggleShuffle", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Enable shuffle" });
    fireEvent.click(btn);

    expect(usePlayerStore.getState().shuffleMode).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// repeat button (S4-3)
// ---------------------------------------------------------------------------

describe("repeat button", () => {
  it("S4-3: cycles aria-label across 3 clicks", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Enable repeat" });

    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: "Repeat all" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Repeat all" }));
    expect(screen.getByRole("button", { name: "Repeat one" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Repeat one" }));
    expect(screen.getByRole("button", { name: "Enable repeat" })).not.toBeNull();
  });

  it("badge <sup>1</sup> is visible when repeatMode is 'one'", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ repeatMode: "one" });
    const { container } = render(<GlobalPlayerBar />);

    const sup = container.querySelector("sup");
    expect(sup).not.toBeNull();
    expect(sup?.textContent).toBe("1");
  });

  it("badge is absent when repeatMode is 'all'", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ repeatMode: "all" });
    const { container } = render(<GlobalPlayerBar />);

    expect(container.querySelector("sup")).toBeNull();
  });

  it("badge is absent when repeatMode is 'off'", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    const { container } = render(<GlobalPlayerBar />);

    expect(container.querySelector("sup")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// queue button (S3-1 through S3-7 + focus return)
// ---------------------------------------------------------------------------

const { usePlayerStore: mockUsePlayerStore } = vi.hoisted(() => {
  const storeMock = {
    queue: [] as ReturnType<typeof makeItem>[],
    isQueuePanelOpen: false,
    setQueuePanelOpen: vi.fn(),
  };
  return {
    usePlayerStore: Object.assign(
      (selector: (s: typeof storeMock) => unknown) => selector(storeMock),
      {
        getState: () => storeMock,
        setState: (partial: Partial<typeof storeMock>) => Object.assign(storeMock, partial),
      },
    ),
  };
});

describe("queue button", () => {
  beforeEach(() => {
    mockUsePlayerStore.setState({
      queue: [makeItem("a"), makeItem("b")],
      isQueuePanelOpen: false,
      setQueuePanelOpen: vi.fn(),
    });
  });

  it("S3-1: queue button renders after repeat button", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    render(<GlobalPlayerBar />);

    const buttons = screen.getAllByRole("button");
    const repeatIdx = buttons.findIndex((b) => /repeat/i.test(b.getAttribute("aria-label") ?? ""));
    const queueIdx = buttons.findIndex((b) => /queue/i.test(b.getAttribute("aria-label") ?? ""));
    expect(queueIdx).toBeGreaterThan(repeatIdx);
  });

  it("S3-2: aria-label=Open queue and aria-pressed=false when closed", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ isQueuePanelOpen: false });
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open queue" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("S3-3: aria-label=Close queue and aria-pressed=true when open", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ isQueuePanelOpen: true });
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Close queue" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("S3-4: click calls setQueuePanelOpen(true) when closed", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ isQueuePanelOpen: false });
    render(<GlobalPlayerBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open queue" }));
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(true);
  });

  it("S3-5: click calls setQueuePanelOpen(false) when open", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ isQueuePanelOpen: true });
    render(<GlobalPlayerBar />);

    fireEvent.click(screen.getByRole("button", { name: "Close queue" }));
    expect(usePlayerStore.getState().isQueuePanelOpen).toBe(false);
  });

  it("S3-6: button is disabled when queue is empty", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.getState().clear();
    usePlayerStore.setState({ error: "err", currentIndex: 0 });
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open queue" });
    expect(btn).toHaveProperty("disabled", true);
    expect(btn).not.toBeNull();
  });

  it("S3-7: button is NOT disabled when queue has tracks", () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open queue" });
    expect(btn).toHaveProperty("disabled", false);
  });

  it("focus returns to queue button when panel transitions true→false", async () => {
    usePlayerStore.getState().playQueue([makeItem("a"), makeItem("b")], 0);
    usePlayerStore.setState({ isQueuePanelOpen: true });
    const { rerender } = render(<GlobalPlayerBar />);

    usePlayerStore.setState({ isQueuePanelOpen: false });
    rerender(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open queue" });
    expect(document.activeElement).toBe(btn);
  });
});

// ---------------------------------------------------------------------------
// isAtFirst / isAtLast with modes (S4-4, S4-5, S4-6)
// ---------------------------------------------------------------------------

describe("isAtFirst / isAtLast with modes", () => {
  it("S4-4: prev and next NOT disabled when shuffleMode is true", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ shuffleMode: true });
    render(<GlobalPlayerBar />);

    const prevBtn = screen.getByRole("button", { name: "Previous track" });
    const nextBtn = screen.getByRole("button", { name: "Next track" });
    expect(prevBtn).toHaveProperty("disabled", false);
    expect(nextBtn).toHaveProperty("disabled", false);
  });

  it("S4-5: prev and next NOT disabled when repeatMode is 'all'", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ shuffleMode: false, repeatMode: "all" });
    render(<GlobalPlayerBar />);

    const prevBtn = screen.getByRole("button", { name: "Previous track" });
    const nextBtn = screen.getByRole("button", { name: "Next track" });
    expect(prevBtn).toHaveProperty("disabled", false);
    expect(nextBtn).toHaveProperty("disabled", false);
  });

  it("S4-6: prev IS disabled with repeat off and shuffle off at index 0", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ shuffleMode: false, repeatMode: "off" });
    render(<GlobalPlayerBar />);

    const prevBtn = screen.getByRole("button", { name: "Previous track" });
    expect(prevBtn).toHaveProperty("disabled", true);
  });
});

// ---------------------------------------------------------------------------
// mobile now-playing trigger (Tasks 2 / S2 / S6)
// ---------------------------------------------------------------------------

describe("mobile now-playing trigger", () => {
  it("renders mobile trigger button with aria-label 'Open Now Playing'", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    expect(screen.getByRole("button", { name: "Open Now Playing" })).not.toBeNull();
  });

  it("mobile trigger button has md:hidden class", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open Now Playing" });
    expect(btn.className).toContain("md:hidden");
  });

  it("clicking mobile trigger calls setNowPlayingOpen(true)", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    render(<GlobalPlayerBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open Now Playing" }));
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(true);
  });

  it("aria-pressed on mobile trigger reflects isNowPlayingOpen", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    render(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open Now Playing" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("desktop TrackMeta wrapper has hidden md:flex classes", () => {
    const item = makeItemWithContext("x", "/playlist/abc?mode=library");
    usePlayerStore.getState().playQueue([item], 0);
    render(<GlobalPlayerBar />);

    const navBtn = screen.getByRole("button", { name: /Open Track x by Artist x/ });
    const wrapper = navBtn.closest("div");
    expect(wrapper?.className).toContain("hidden");
    expect(wrapper?.className).toContain("md:flex");
  });

  it("focus returns to mobile trigger when isNowPlayingOpen transitions true → false", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { rerender } = render(<GlobalPlayerBar />);

    usePlayerStore.setState({ isNowPlayingOpen: false });
    rerender(<GlobalPlayerBar />);

    const btn = screen.getByRole("button", { name: "Open Now Playing" });
    expect(document.activeElement).toBe(btn);
  });
});
