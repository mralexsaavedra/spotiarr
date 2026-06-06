import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueueSidePanel } from "./QueueSidePanel";

const mockStore = vi.hoisted(() => ({
  queue: [] as Array<{ id: string; name: string; artist: string; audioUrl: string }>,
  currentIndex: 0 as number | null,
  shuffleMode: false,
  repeatMode: "off" as "off" | "all" | "one",
  isQueuePanelOpen: false,
  setQueuePanelOpen: vi.fn(),
  playFromIndex: vi.fn(),
  reorderQueue: vi.fn(),
}));

vi.mock("@/store/usePlayerStore", () => ({
  usePlayerStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock("react-i18next", async () => {
  const actual = await vi.importActual<typeof import("react-i18next")>("react-i18next");
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => {
        const map: Record<string, string> = {
          "player.queue.title": "Queue",
          "player.queue.empty": "No tracks in queue",
          "player.queue.toggleOpen": "Open queue",
          "player.queue.toggleClose": "Close queue",
          "player.queue.close": "Close",
          "player.queue.repeatAll": "Repeat all",
          "player.queue.repeatOne": "Repeat one",
          "player.queue.shuffleOn": "Shuffle on",
        };
        return map[key] ?? key;
      },
    }),
  };
});

const makeItem = (id: string) => ({
  id,
  name: `Track ${id}`,
  artist: `Artist ${id}`,
  audioUrl: `/api/audio/${id}`,
});

function resetMock() {
  mockStore.queue = [];
  mockStore.currentIndex = 0;
  mockStore.shuffleMode = false;
  mockStore.repeatMode = "off";
  mockStore.isQueuePanelOpen = false;
  mockStore.setQueuePanelOpen = vi.fn();
  mockStore.playFromIndex = vi.fn();
  mockStore.reorderQueue = vi.fn();
}

function makeDragTransfer(data = "") {
  return {
    setData: vi.fn(),
    getData: vi.fn().mockReturnValue(data),
    effectAllowed: "",
    dropEffect: "",
  };
}

beforeEach(resetMock);
afterEach(() => {
  vi.clearAllMocks();
  resetMock();
});

describe("panel visibility (S4-1, S4-2)", () => {
  it("S4-1: panel has translate-x-full when closed", () => {
    mockStore.isQueuePanelOpen = false;
    const { container } = render(<QueueSidePanel />);
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("translate-x-full");
    expect(aside?.className).not.toContain("translate-x-0");
  });

  it("S4-1: backdrop is not rendered when closed", () => {
    mockStore.isQueuePanelOpen = false;
    render(<QueueSidePanel />);
    expect(screen.queryByTestId("queue-backdrop")).toBeNull();
  });

  it("S4-2: panel has translate-x-0 when open", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a")];
    const { container } = render(<QueueSidePanel />);
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("translate-x-0");
  });

  it("S4-2: backdrop is rendered when open", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    expect(screen.getByTestId("queue-backdrop")).not.toBeNull();
  });
});

describe("panel close actions (S4-3, S4-4, S4-5, S4-6)", () => {
  it("S4-3: backdrop click calls setQueuePanelOpen(false)", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    fireEvent.click(screen.getByTestId("queue-backdrop"));
    expect(mockStore.setQueuePanelOpen).toHaveBeenCalledWith(false);
  });

  it("S4-4: X button click calls setQueuePanelOpen(false)", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(mockStore.setQueuePanelOpen).toHaveBeenCalledWith(false);
  });

  it("S4-5: ESC keydown calls setQueuePanelOpen(false) when open", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockStore.setQueuePanelOpen).toHaveBeenCalledWith(false);
  });

  it("S4-6: ESC keydown does nothing when closed", () => {
    mockStore.isQueuePanelOpen = false;
    render(<QueueSidePanel />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockStore.setQueuePanelOpen).not.toHaveBeenCalled();
  });
});

describe("queue list (S5-1, S5-2, S5-3, S5-4, S5-7)", () => {
  it("S5-1: renders 3 li rows for queue of 3 tracks when open", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a"), makeItem("b"), makeItem("c")];
    mockStore.currentIndex = 0;
    render(<QueueSidePanel />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("S5-2: row at currentIndex has aria-current=true; others do not", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a"), makeItem("b"), makeItem("c")];
    mockStore.currentIndex = 1;
    render(<QueueSidePanel />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.getAttribute("aria-current")).not.toBe("true");
    expect(items[1]?.getAttribute("aria-current")).toBe("true");
    expect(items[2]?.getAttribute("aria-current")).not.toBe("true");
  });

  it("S5-3: click row index 2 calls playFromIndex(2)", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a"), makeItem("b"), makeItem("c")];
    mockStore.currentIndex = 0;
    render(<QueueSidePanel />);
    const buttons = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-label") === null || /Track/i.test(b.textContent ?? ""));
    fireEvent.click(buttons[2]!);
    expect(mockStore.playFromIndex).toHaveBeenCalledWith(2);
  });

  it("S5-4: empty queue renders empty-state message", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [];
    render(<QueueSidePanel />);
    expect(screen.getByText("No tracks in queue")).not.toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
  });

  it("S5-7: Enter key on row button calls playFromIndex", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a"), makeItem("b")];
    mockStore.currentIndex = 0;
    render(<QueueSidePanel />);
    const rowButtons = screen
      .getAllByRole("button")
      .filter((b) => /Track/i.test(b.textContent ?? ""));
    fireEvent.keyDown(rowButtons[1]!, { key: "Enter" });
    expect(mockStore.playFromIndex).toHaveBeenCalledWith(1);
  });
});

describe("header indicators (S6-1 through S6-6)", () => {
  it("S6-1: shuffle indicator rendered when shuffleMode=true", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.shuffleMode = true;
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    expect(screen.getByText("Shuffle on")).not.toBeNull();
  });

  it("S6-2: no shuffle indicator when shuffleMode=false", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.shuffleMode = false;
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    expect(screen.queryByText("Shuffle on")).toBeNull();
  });

  it("S6-3: repeat badge shows Repeat all when repeatMode=all", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.repeatMode = "all";
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    expect(screen.getByText("Repeat all")).not.toBeNull();
  });

  it("S6-4: repeat badge shows Repeat one when repeatMode=one", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.repeatMode = "one";
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    expect(screen.getByText("Repeat one")).not.toBeNull();
  });

  it("S6-5: no repeat badge when repeatMode=off", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.repeatMode = "off";
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    expect(screen.queryByText("Repeat all")).toBeNull();
    expect(screen.queryByText("Repeat one")).toBeNull();
  });

  it("S6-6: shuffle indicator and repeat badge have no click handlers (no store calls on click)", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.shuffleMode = true;
    mockStore.repeatMode = "all";
    mockStore.queue = [makeItem("a")];
    render(<QueueSidePanel />);
    fireEvent.click(screen.getByText("Shuffle on"));
    fireEvent.click(screen.getByText("Repeat all"));
    expect(mockStore.setQueuePanelOpen).not.toHaveBeenCalled();
    expect(mockStore.playFromIndex).not.toHaveBeenCalled();
  });
});

describe("backdrop propagation (S7-4)", () => {
  it("S7-4: backdrop click does not propagate to elements behind", () => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a")];
    const outerClick = vi.fn();
    render(
      <div onClick={outerClick}>
        <QueueSidePanel />
      </div>,
    );
    const backdrop = screen.getByTestId("queue-backdrop");
    fireEvent.click(backdrop);
    expect(outerClick).not.toHaveBeenCalled();
  });
});

describe("drag and drop", () => {
  beforeEach(() => {
    mockStore.isQueuePanelOpen = true;
    mockStore.queue = [makeItem("a"), makeItem("b"), makeItem("c")];
    mockStore.currentIndex = 0;
  });

  it('dragstart on row N sets dataTransfer text/plain to "N"', () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dt = makeDragTransfer();
    fireEvent.dragStart(rows[2]!, { dataTransfer: dt });
    expect(dt.setData).toHaveBeenCalledWith("text/plain", "2");
  });

  it('dragstart sets effectAllowed to "move"', () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dt = makeDragTransfer();
    fireEvent.dragStart(rows[1]!, { dataTransfer: dt });
    expect(dt.effectAllowed).toBe("move");
  });

  it("dragover calls preventDefault", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const event = new Event("dragover", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    rows[0]!.dispatchEvent(event);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("drop on row M after dragstart on row N calls reorderQueue(N, M)", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dtStart = makeDragTransfer();
    fireEvent.dragStart(rows[1]!, { dataTransfer: dtStart });

    const dtDrop = makeDragTransfer("1");
    fireEvent.drop(rows[2]!, { dataTransfer: dtDrop });
    expect(mockStore.reorderQueue).toHaveBeenCalledWith(1, 2);
  });

  it("dragged row gets opacity-50 class after dragstart", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dt = makeDragTransfer();
    fireEvent.dragStart(rows[0]!, { dataTransfer: dt });
    expect(rows[0]!.className).toContain("opacity-50");
  });

  it("dragged row loses opacity-50 class after dragend", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dt = makeDragTransfer();
    fireEvent.dragStart(rows[0]!, { dataTransfer: dt });
    fireEvent.dragEnd(rows[0]!);
    expect(rows[0]!.className).not.toContain("opacity-50");
  });

  it("drop target row gets border-t-2 class during dragover", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dtStart = makeDragTransfer();
    fireEvent.dragStart(rows[0]!, { dataTransfer: dtStart });

    const dtOver = makeDragTransfer();
    fireEvent.dragOver(rows[2]!, { dataTransfer: dtOver });
    expect(rows[2]!.className).toContain("border-t-2");
  });

  it("drop target row loses border-t-2 class after dragend", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dtStart = makeDragTransfer();
    fireEvent.dragStart(rows[0]!, { dataTransfer: dtStart });
    fireEvent.dragOver(rows[2]!, { dataTransfer: dtStart });
    fireEvent.dragEnd(rows[0]!);
    expect(rows[2]!.className).not.toContain("border-t-2");
  });

  it("drop with non-numeric dataTransfer is no-op (NaN guard)", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dtDrop = makeDragTransfer("not-a-number");
    fireEvent.drop(rows[0]!, { dataTransfer: dtDrop });
    expect(mockStore.reorderQueue).not.toHaveBeenCalled();
  });

  it("dragend without drop clears all drag visual state", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dt = makeDragTransfer();
    fireEvent.dragStart(rows[1]!, { dataTransfer: dt });
    fireEvent.dragOver(rows[2]!, { dataTransfer: dt });
    fireEvent.dragEnd(rows[1]!);
    expect(rows[1]!.className).not.toContain("opacity-50");
    expect(rows[2]!.className).not.toContain("border-t-2");
  });

  it("ESC closes panel after drag interaction", () => {
    render(<QueueSidePanel />);
    const rows = screen.getAllByRole("listitem");
    const dt = makeDragTransfer();
    fireEvent.dragStart(rows[0]!, { dataTransfer: dt });
    fireEvent.dragEnd(rows[0]!);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockStore.setQueuePanelOpen).toHaveBeenCalledWith(false);
  });

  it("click on row still triggers playFromIndex after DnD is wired", () => {
    render(<QueueSidePanel />);
    const buttons = screen.getAllByRole("button").filter((b) => /Track/i.test(b.textContent ?? ""));
    fireEvent.click(buttons[1]!);
    expect(mockStore.playFromIndex).toHaveBeenCalledWith(1);
  });
});
