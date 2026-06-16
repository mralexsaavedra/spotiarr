import { NormalizedTrack } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchTrackList } from "./SearchTrackList";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("react-router-dom", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkTrackStatus: () => new Map(),
}));

vi.mock("../molecules/VirtualList", () => ({
  VirtualList: <T,>({
    items,
    renderItem,
    itemKey,
  }: {
    items: T[];
    renderItem: (item: T, index: number) => React.ReactNode;
    itemKey: (item: T) => string;
  }) => (
    <div>
      {items.map((item, index) => (
        <div key={itemKey(item)}>{renderItem(item, index)}</div>
      ))}
    </div>
  ),
}));

vi.mock("../atoms/Image", () => ({
  Image: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock("../molecules/TrackStatusIndicator", () => ({
  TrackStatusIndicator: ({
    index,
    onDownload,
  }: {
    index: number;
    onDownload?: (e: React.MouseEvent) => void;
  }) => (
    <div data-testid="status-indicator" data-index={index}>
      {onDownload && (
        <button type="button" onClick={onDownload} aria-label="download">
          download
        </button>
      )}
    </div>
  ),
}));

const makeTrack = (overrides: Partial<NormalizedTrack> = {}): NormalizedTrack => ({
  name: "Normalized Track",
  artist: "Some Artist",
  trackUrl: "https://open.spotify.com/track/nt1",
  artists: [],
  ...overrides,
});

describe("SearchTrackList", () => {
  it("renders one row per track", () => {
    const tracks = [
      makeTrack({ name: "Song A", trackUrl: "url-a" }),
      makeTrack({ name: "Song B", trackUrl: "url-b" }),
    ];
    render(<SearchTrackList tracks={tracks} onDownload={vi.fn()} />);
    expect(screen.getByText("Song A")).toBeTruthy();
    expect(screen.getByText("Song B")).toBeTruthy();
  });

  it("renders nothing when the tracks list is empty", () => {
    render(<SearchTrackList tracks={[]} onDownload={vi.fn()} />);
    expect(screen.queryAllByTestId("status-indicator")).toHaveLength(0);
  });

  it("calls onDownload with the original NormalizedTrack when the download button is clicked", () => {
    const onDownload = vi.fn();
    const track = makeTrack({ name: "Click Me", trackUrl: "https://open.spotify.com/track/dl" });
    render(<SearchTrackList tracks={[track]} onDownload={onDownload} />);

    fireEvent.click(screen.getByRole("button", { name: "download" }));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ name: "Click Me" }));
  });
});
