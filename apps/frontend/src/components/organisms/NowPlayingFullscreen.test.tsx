import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePlayerStore } from "@/store/usePlayerStore";
import { NowPlayingFullscreen } from "./NowPlayingFullscreen";

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const map: Record<string, string> = {
          "player.nowPlaying.title": "Now Playing",
          "player.nowPlaying.open": "Open Now Playing",
          "player.nowPlaying.close": "Close",
          "player.nowPlaying.queueLabel": "Queue",
        };
        if (key === "player.nowPlaying.dragHandle" && opts?.name) {
          return `Drag to reorder ${opts.name as string}`;
        }
        return map[key] ?? key;
      },
    }),
  };
});

HTMLElement.prototype.setPointerCapture = vi.fn();
HTMLElement.prototype.releasePointerCapture = vi.fn();

// jsdom does not implement elementFromPoint — define it so spies work
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null;
}

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
    isNowPlayingOpen: false,
    isQueuePanelOpen: false,
  });
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  vi.clearAllMocks();
  resetStore();
});

// ---------------------------------------------------------------------------
// Tests 11–25: NowPlayingFullscreen shell
// ---------------------------------------------------------------------------

describe("NowPlayingFullscreen shell", () => {
  it("11. renders role=dialog with non-empty aria-label", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    render(<NowPlayingFullscreen />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-label")).toBeTruthy();
  });

  it("12. renders blurred backdrop img with aria-hidden when artworkUrl exists", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const backdrop = container.querySelector("img[aria-hidden='true']");
    expect(backdrop).not.toBeNull();
  });

  it("13. renders track name and artist from currentItem", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    render(<NowPlayingFullscreen />);

    expect(screen.getAllByText("Track a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Artist a").length).toBeGreaterThan(0);
  });

  it("14. renders transport buttons; clicking play/pause calls togglePlay", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true, isPlaying: false });
    render(<NowPlayingFullscreen />);

    const playBtn = screen.getByRole("button", { name: "Play" });
    expect(playBtn).not.toBeNull();
    fireEvent.click(playBtn);
    expect(usePlayerStore.getState().isPlaying).toBe(true);
  });

  it("15. renders seek scrubber wired to currentTime/duration; change calls seek", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true, currentTime: 30, duration: 180 });
    render(<NowPlayingFullscreen />);

    const slider = screen.getByRole("slider", { name: "Seek" });
    expect(slider).not.toBeNull();
    fireEvent.change(slider, { target: { value: "90" } });
    expect(usePlayerStore.getState().currentTime).toBe(90);
  });

  it("16. renders queue rows; row count matches queue.length", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const rows = container.querySelectorAll("li");
    expect(rows.length).toBe(3);
  });

  it("17. active row at currentIndex carries aria-current=true", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 1);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const rows = container.querySelectorAll("li");
    expect(rows[1]?.getAttribute("aria-current")).toBe("true");
    expect(rows[0]?.getAttribute("aria-current")).toBeFalsy();
  });

  it("18. clicking row N calls playFromIndex(N)", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    render(<NowPlayingFullscreen />);

    // click the play button inside row 2 (Track c) - exact match avoids dragHandle label collision
    const rowBtn = screen.getByRole("button", { name: "Track c" });
    fireEvent.click(rowBtn);
    expect(usePlayerStore.getState().currentIndex).toBe(2);
  });

  it("19. chevron button click calls setNowPlayingOpen(false)", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    render(<NowPlayingFullscreen />);

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("20. ESC keydown calls setNowPlayingOpen(false) when open", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    render(<NowPlayingFullscreen />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("21. ESC keydown does nothing when isNowPlayingOpen is false", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: false });
    render(<NowPlayingFullscreen />);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("22. root has translate-y-0 when open, translate-y-full when closed", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { rerender } = render(<NowPlayingFullscreen />);

    let dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("translate-y-0");

    usePlayerStore.setState({ isNowPlayingOpen: false });
    rerender(<NowPlayingFullscreen />);
    dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("translate-y-full");
  });

  it("23. root has motion-reduce:transition-none class", () => {
    render(<NowPlayingFullscreen />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("motion-reduce:transition-none");
  });

  it("24. focus moves to close button when isNowPlayingOpen transitions to true", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: false });
    const { rerender } = render(<NowPlayingFullscreen />);

    usePlayerStore.setState({ isNowPlayingOpen: true });
    rerender(<NowPlayingFullscreen />);

    const closeBtn = screen.getByRole("button", { name: "Close" });
    expect(document.activeElement).toBe(closeBtn);
  });

  it("25. root carries md:hidden class", () => {
    render(<NowPlayingFullscreen />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("md:hidden");
  });
});

// ---------------------------------------------------------------------------
// Tests 26–31: Touch reorder via Pointer Events
// ---------------------------------------------------------------------------

describe("touch reorder", () => {
  beforeEach(() => {
    vi.spyOn(document, "elementFromPoint").mockReturnValue(null);
  });

  it("26. pointerdown on drag handle sets opacity-50 on dragging row", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const handles = container.querySelectorAll("[data-drag-handle]");
    act(() => {
      fireEvent.pointerDown(handles[0]!, { clientX: 0, clientY: 0, pointerId: 1 });
    });

    const rows = container.querySelectorAll("li");
    expect(rows[0]?.className).toContain("opacity-50");
  });

  it("27. pointermove over another row shows border-t-2 on hovered row", () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const rows = container.querySelectorAll("li");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(rows[1] as Element);

    const handles = container.querySelectorAll("[data-drag-handle]");
    act(() => {
      fireEvent.pointerDown(handles[0]!, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(handles[0]!, { clientX: 0, clientY: 60, pointerId: 1 });
    });

    expect(rows[1]?.className).toContain("border-t-2");
  });

  it("28. pointerup after move calls reorderQueue(fromIndex, dragOverIndex)", () => {
    const reorderSpy = vi.fn();
    usePlayerStore.setState({ reorderQueue: reorderSpy } as unknown as Parameters<
      typeof usePlayerStore.setState
    >[0]);

    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const rows = container.querySelectorAll("li");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(rows[2] as Element);

    const handles = container.querySelectorAll("[data-drag-handle]");
    act(() => {
      fireEvent.pointerDown(handles[0]!, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(handles[0]!, { clientX: 0, clientY: 60, pointerId: 1 });
      fireEvent.pointerUp(handles[0]!, { clientX: 0, clientY: 60, pointerId: 1 });
    });

    expect(reorderSpy).toHaveBeenCalledWith(0, 2);
  });

  it("29. pointercancel clears state without calling reorderQueue", () => {
    const reorderSpy = vi.fn();
    usePlayerStore.setState({ reorderQueue: reorderSpy } as unknown as Parameters<
      typeof usePlayerStore.setState
    >[0]);

    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const handles = container.querySelectorAll("[data-drag-handle]");
    act(() => {
      fireEvent.pointerDown(handles[0]!, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerCancel(handles[0]!, { pointerId: 1 });
    });

    expect(reorderSpy).not.toHaveBeenCalled();
    const rows = container.querySelectorAll("li");
    expect(rows[0]?.className).not.toContain("opacity-50");
  });

  it("30. pointerup with from === to does NOT call reorderQueue", () => {
    const reorderSpy = vi.fn();
    usePlayerStore.setState({ reorderQueue: reorderSpy } as unknown as Parameters<
      typeof usePlayerStore.setState
    >[0]);

    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const rows = container.querySelectorAll("li");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(rows[0] as Element);

    const handles = container.querySelectorAll("[data-drag-handle]");
    act(() => {
      fireEvent.pointerDown(handles[0]!, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent.pointerMove(handles[0]!, { clientX: 0, clientY: 5, pointerId: 1 });
      fireEvent.pointerUp(handles[0]!, { clientX: 0, clientY: 5, pointerId: 1 });
    });

    expect(reorderSpy).not.toHaveBeenCalled();
  });

  it("31. drag handle has touch-action: none style and non-empty aria-label", () => {
    const items = [makeItem("a"), makeItem("b")];
    usePlayerStore.getState().playQueue(items, 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const handle = container.querySelector("[data-drag-handle]") as HTMLElement;
    expect(handle).not.toBeNull();
    expect(handle.getAttribute("aria-label")).toBeTruthy();
    expect(handle.style.touchAction).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Tests 32–34: Swipe-down close gesture
// ---------------------------------------------------------------------------

describe("swipe-down close", () => {
  it("32. pointerdown + pointermove 100px down + pointerup closes panel", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const heroZone = container.querySelector("[data-swipe-zone]") as HTMLElement;
    act(() => {
      fireEvent.pointerDown(heroZone, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(heroZone, { clientX: 100, clientY: 200, pointerId: 1 });
      fireEvent.pointerUp(heroZone, { clientX: 100, clientY: 200, pointerId: 1 });
    });

    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(false);
  });

  it("33. pointermove 50px down + pointerup does NOT close (below 80px threshold)", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const heroZone = container.querySelector("[data-swipe-zone]") as HTMLElement;
    act(() => {
      fireEvent.pointerDown(heroZone, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(heroZone, { clientX: 100, clientY: 150, pointerId: 1 });
      fireEvent.pointerUp(heroZone, { clientX: 100, clientY: 150, pointerId: 1 });
    });

    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(true);
  });

  it("34. pointerdown on data-no-swipe ancestor does NOT engage swipe", () => {
    usePlayerStore.getState().playQueue([makeItem("a")], 0);
    usePlayerStore.setState({ isNowPlayingOpen: true });
    const { container } = render(<NowPlayingFullscreen />);

    const noSwipeEl = container.querySelector("[data-no-swipe]") as HTMLElement;
    act(() => {
      fireEvent.pointerDown(noSwipeEl, { clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(noSwipeEl, { clientX: 100, clientY: 200, pointerId: 1 });
      fireEvent.pointerUp(noSwipeEl, { clientX: 100, clientY: 200, pointerId: 1 });
    });

    expect(usePlayerStore.getState().isNowPlayingOpen).toBe(true);
  });
});
