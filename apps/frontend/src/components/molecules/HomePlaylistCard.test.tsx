import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistWithStats } from "@/types";
import { TrackStatusEnum } from "@spotiarr/shared";
import { HomePlaylistCard } from "./HomePlaylistCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const makePlaylist = (overrides: Partial<PlaylistWithStats> = {}): PlaylistWithStats => ({
  id: "playlist-1",
  name: "Test Playlist",
  owner: "John Doe",
  coverUrl: "https://example.com/cover.jpg",
  tracks: [
    {
      id: "t1",
      name: "Track 1",
      artist: "Artist 1",
      status: TrackStatusEnum.Completed,
      playlistId: "playlist-1",
    },
  ],
  stats: {
    completedCount: 1,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 0,
    activeCount: 0,
    errorCount: 0,
    totalCount: 100,
    progress: 1,
    isDownloading: false,
    hasErrors: false,
    isCompleted: false,
  },
  ...overrides,
});

describe("HomePlaylistCard", () => {
  it("renders the playlist name", () => {
    const playlist = makePlaylist({ name: "Road Trip Vibes" });
    render(
      <HomePlaylistCard
        playlist={playlist}
        downloadedCount={5}
        totalCount={50}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Road Trip Vibes")).not.toBeNull();
  });

  it("renders the owner", () => {
    const playlist = makePlaylist({ owner: "Jane Smith" });
    render(
      <HomePlaylistCard
        playlist={playlist}
        downloadedCount={5}
        totalCount={50}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/Jane Smith/)).not.toBeNull();
  });

  it("renders downloaded/total count badge", () => {
    const playlist = makePlaylist();
    render(
      <HomePlaylistCard
        playlist={playlist}
        downloadedCount={12}
        totalCount={187}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("12/187")).not.toBeNull();
  });

  it("renders cover image when coverUrl is provided", () => {
    const playlist = makePlaylist({ coverUrl: "https://example.com/img.jpg" });
    render(
      <HomePlaylistCard
        playlist={playlist}
        downloadedCount={1}
        totalCount={10}
        onClick={vi.fn()}
      />,
    );
    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://example.com/img.jpg");
  });

  it("fires onClick with the playlist id when clicked", () => {
    const onClick = vi.fn();
    const playlist = makePlaylist({ id: "my-id" });
    render(
      <HomePlaylistCard playlist={playlist} downloadedCount={1} totalCount={10} onClick={onClick} />,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith("my-id");
  });
});
