import { TrackStatusEnum } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrackList, TrackListTrack } from "./TrackList";

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
  useBulkTrackStatus: () => new Map<string, TrackStatusEnum>(),
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
    status,
  }: {
    index: number;
    onDownload?: (e: React.MouseEvent) => void;
    status?: TrackStatusEnum;
  }) => (
    <div data-testid="status-indicator" data-index={index} data-status={status ?? "none"}>
      {onDownload && (
        <button type="button" onClick={onDownload} aria-label="download">
          download
        </button>
      )}
    </div>
  ),
}));

const makeTrack = (overrides: Partial<TrackListTrack> = {}): TrackListTrack => ({
  name: "Track One",
  artist: "Artist One",
  trackUrl: "https://open.spotify.com/track/t1",
  durationMs: 180000,
  ...overrides,
});

describe("TrackList", () => {
  it("renders one row per track", () => {
    const tracks = [
      makeTrack({ name: "Track A", trackUrl: "url-a" }),
      makeTrack({ name: "Track B", trackUrl: "url-b" }),
    ];
    render(<TrackList tracks={tracks} onDownload={vi.fn()} />);
    expect(screen.getByText("Track A")).toBeTruthy();
    expect(screen.getByText("Track B")).toBeTruthy();
  });

  it("renders nothing when the tracks list is empty", () => {
    render(<TrackList tracks={[]} onDownload={vi.fn()} />);
    expect(screen.queryAllByTestId("status-indicator")).toHaveLength(0);
  });

  it("renders the artist name for each track", () => {
    render(<TrackList tracks={[makeTrack({ artist: "Portishead" })]} onDownload={vi.fn()} />);
    expect(screen.getByText("Portishead")).toBeTruthy();
  });

  it("renders the formatted duration when durationMs is provided", () => {
    // 180000ms = 3:00
    render(<TrackList tracks={[makeTrack({ durationMs: 180000 })]} onDownload={vi.fn()} />);
    expect(screen.getByText("3:00")).toBeTruthy();
  });

  it("renders --:-- when durationMs is absent", () => {
    render(<TrackList tracks={[makeTrack({ durationMs: undefined })]} onDownload={vi.fn()} />);
    expect(screen.getByText("--:--")).toBeTruthy();
  });

  it("calls onDownload when the download button in the status indicator is clicked", () => {
    const onDownload = vi.fn();
    const track = makeTrack({
      name: "Downloadable",
      trackUrl: "https://open.spotify.com/track/dl",
    });
    render(<TrackList tracks={[track]} onDownload={onDownload} />);

    fireEvent.click(screen.getByRole("button", { name: "download" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ name: "Downloadable" }));
  });

  it("passes index starting at 1 to TrackStatusIndicator", () => {
    const tracks = [
      makeTrack({ name: "T1", trackUrl: "url-1" }),
      makeTrack({ name: "T2", trackUrl: "url-2" }),
    ];
    render(<TrackList tracks={tracks} onDownload={vi.fn()} />);
    const indicators = screen.getAllByTestId("status-indicator");
    expect(indicators[0].getAttribute("data-index")).toBe("1");
    expect(indicators[1].getAttribute("data-index")).toBe("2");
  });

  it("renders a link for spotify trackUrl", () => {
    render(
      <TrackList
        tracks={[
          makeTrack({ name: "Linked Track", trackUrl: "https://open.spotify.com/track/abc" }),
        ]}
        onDownload={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: "Linked Track" });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain("/preview");
  });

  it("renders no download button when trackUrl is missing", () => {
    render(
      <TrackList
        tracks={[makeTrack({ name: "No URL", trackUrl: undefined })]}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "download" })).toBeNull();
  });
});
