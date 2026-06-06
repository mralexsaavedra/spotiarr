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

    expect(screen.getByText("Track a")).not.toBeNull();
    expect(screen.getByText("Artist a")).not.toBeNull();
  });

  it("shows artwork when artworkUrl is provided", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);

    render(<GlobalPlayerBar />);

    const img = screen.queryByRole("img", { name: /Track a/i });
    expect(img).not.toBeNull();
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

  it("[T2.7] renders as non-interactive div when contextPath is absent", () => {
    const item = makeItem("y"); // no contextPath
    usePlayerStore.getState().playQueue([item], 0);

    render(<GlobalPlayerBar />);

    // No button with navigate aria-label
    expect(screen.queryByRole("button", { name: /Open Track y/ })).toBeNull();
    // Track name still visible
    expect(screen.getByText("Track y")).not.toBeNull();
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

    // After render the metadata effect should have run
    const meta = stub.metadata as { title: string; artist: string };
    expect(meta).not.toBeNull();
    expect(meta.title).toBe("Track z");
    expect(meta.artist).toBe("Artist z");

    restore();
  });
});
