import type { PlaylistHistory } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Playlist } from "@/types";
import { DownloadHistorySection } from "./DownloadHistorySection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("@/components/organisms/HistoryList", () => ({
  HistoryList: () => <div data-testid="history-list" />,
}));

vi.mock("@fortawesome/free-solid-svg-icons", () => ({
  faClockRotateLeft: {},
}));

const makeHistoryItem = (id: string): PlaylistHistory => ({
  playlistId: id,
  playlistName: `Playlist ${id}`,
  playlistSpotifyUrl: `https://open.spotify.com/playlist/${id}`,
  trackCount: 5,
  lastCompletedAt: Date.now(),
});

const defaultProps = {
  history: [] as PlaylistHistory[],
  isLoading: false,
  activePlaylists: [] as Playlist[],
  recreatingUrl: null,
  onRecreate: vi.fn(),
  onItemClick: vi.fn(),
};

describe("DownloadHistorySection", () => {
  it("renders Loading when isLoading is true", () => {
    render(<DownloadHistorySection {...defaultProps} isLoading={true} />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("history-list")).toBeNull();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("renders EmptyState when history is empty and not loading", () => {
    render(<DownloadHistorySection {...defaultProps} history={[]} />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.queryByTestId("history-list")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("renders HistoryList when history has items", () => {
    render(
      <DownloadHistorySection
        {...defaultProps}
        history={[makeHistoryItem("p1"), makeHistoryItem("p2")]}
      />,
    );

    expect(screen.getByTestId("history-list")).toBeTruthy();
    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("renders a heading using the history.title i18n key", () => {
    render(<DownloadHistorySection {...defaultProps} history={[makeHistoryItem("p1")]} />);

    expect(screen.getByRole("heading", { name: "history.title" })).toBeTruthy();
  });

  it("does not call onRecreate on initial render", () => {
    const onRecreate = vi.fn();
    render(<DownloadHistorySection {...defaultProps} onRecreate={onRecreate} />);

    expect(onRecreate).not.toHaveBeenCalled();
  });

  it("does not call onItemClick on initial render", () => {
    const onItemClick = vi.fn();
    render(<DownloadHistorySection {...defaultProps} onItemClick={onItemClick} />);

    expect(onItemClick).not.toHaveBeenCalled();
  });
});
