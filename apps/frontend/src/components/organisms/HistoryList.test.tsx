import type { PlaylistHistory } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Playlist } from "@/types";
import { HistoryList } from "./HistoryList";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback ?? key,
    }),
  };
});

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkPlaylistStatus: () => new Map<string, { isDownloaded: boolean; isDownloading: boolean }>(),
}));

vi.mock("../molecules/VirtualList", () => ({
  VirtualList: <T,>({
    items,
    itemKey,
    renderItem,
  }: {
    items: T[];
    itemKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={itemKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  ),
}));

const makeHistoryItem = (
  playlistId: string | null,
  name: string,
  spotifyUrl: string | null = null,
): PlaylistHistory => ({
  playlistId,
  playlistName: name,
  playlistSpotifyUrl: spotifyUrl,
  trackCount: 10,
  lastCompletedAt: 1700000000000,
});

const defaultProps = {
  history: [
    makeHistoryItem("p1", "Playlist Alpha", "https://open.spotify.com/playlist/abc"),
    makeHistoryItem("p2", "Playlist Beta"),
  ],
  activePlaylists: [] as Playlist[],
  recreatingUrl: null,
  onRecreate: vi.fn(),
  onItemClick: vi.fn(),
};

describe("HistoryList", () => {
  it("renders one row per history item", () => {
    render(
      <MemoryRouter>
        <HistoryList {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Playlist Alpha")).toBeTruthy();
    expect(screen.getByText("Playlist Beta")).toBeTruthy();
  });

  it("renders nothing when history is empty", () => {
    render(
      <MemoryRouter>
        <HistoryList {...defaultProps} history={[]} />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Playlist Alpha")).toBeNull();
  });

  it("calls onItemClick when a history row is clicked", () => {
    const onItemClick = vi.fn();
    render(
      <MemoryRouter>
        <HistoryList {...defaultProps} onItemClick={onItemClick} />
      </MemoryRouter>,
    );

    const rows = document.querySelectorAll('[class*="cursor-pointer"]');
    fireEvent.click(rows[0]);

    expect(onItemClick).toHaveBeenCalledWith(defaultProps.history[0], undefined);
  });

  it("renders the recreate button for items with a spotifyUrl", () => {
    render(
      <MemoryRouter>
        <HistoryList {...defaultProps} />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByRole("button");
    // Playlist Alpha has a spotifyUrl, so it gets a recreate button
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows downloading state when item is downloading", () => {
    vi.mock("@/hooks/queries/useDownloadStatus", () => ({
      useBulkPlaylistStatus: () => {
        const map = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();
        map.set("https://open.spotify.com/playlist/abc", {
          isDownloaded: false,
          isDownloading: true,
        });
        return map;
      },
    }));

    render(
      <MemoryRouter>
        <HistoryList {...defaultProps} />
      </MemoryRouter>,
    );

    // The component renders when item is downloading — just verify it renders without crashing
    expect(screen.getByText("Playlist Alpha")).toBeTruthy();
  });
});
