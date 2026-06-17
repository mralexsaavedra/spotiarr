import { TrackStatusEnum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistWithStats } from "@/types";
import { Home } from "./Home";

const mockUseHomeController = vi.fn();

vi.mock("@/hooks/controllers/useHomeController", () => ({
  useHomeController: () => mockUseHomeController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | Record<string, unknown>) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

vi.mock("@/components/organisms/ScanLibraryModal", () => ({
  ScanLibraryModal: () => null,
}));

vi.mock("@/components/organisms/ArtworkBackfillStatusIndicator", () => ({
  ArtworkBackfillStatusIndicator: () => null,
}));

vi.mock("@/components/organisms/LibraryArtistList", () => ({
  LibraryArtistList: ({ artists }: { artists: unknown[] }) => (
    <div data-testid="artist-list" data-count={artists.length} />
  ),
}));

vi.mock("@/components/organisms/HomePlaylistList", () => ({
  HomePlaylistList: ({ items }: { items: unknown[] }) => (
    <div data-testid="home-playlist-list" data-count={items.length} />
  ),
}));

const makePlaylist = (id: string, name: string): PlaylistWithStats => ({
  id,
  name,
  owner: "test-owner",
  coverUrl: undefined,
  tracks: [
    {
      id: `${id}-t1`,
      name: "Track 1",
      artist: "Artist",
      status: TrackStatusEnum.Completed,
      playlistId: id,
    },
  ],
  stats: {
    completedCount: 1,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 0,
    activeCount: 0,
    errorCount: 0,
    totalCount: 10,
    progress: 10,
    isDownloading: false,
    hasErrors: false,
    isCompleted: false,
  },
});

const defaultController = {
  t: (key: string, fallback?: string) => fallback ?? key,
  stats: null,
  artists: [],
  isLoading: false,
  isScanning: false,
  isScanModalOpen: false,
  artworkBackfillStatus: { status: "idle" },
  isArtworkBackfillActive: false,
  handleOpenScanModal: vi.fn(),
  handleCloseScanModal: vi.fn(),
  handleConfirmScan: vi.fn(),
  handleArtistClick: vi.fn(),
  handlePlaylistClick: vi.fn(),
  handleSearchChange: vi.fn(),
  formatSize: vi.fn(),
  search: "",
  downloadedPlaylists: [],
  filteredPlaylists: [],
  filteredArtists: [],
};

describe("Home", () => {
  it("renders the playlists section before the artists list when playlists with downloads exist", () => {
    const p = makePlaylist("p1", "Chill Vibes");
    mockUseHomeController.mockReturnValue({
      ...defaultController,
      artists: [
        { name: "Artist A", path: "/a", albumCount: 1, trackCount: 5, totalSize: 0, albums: [] },
      ],
      filteredArtists: [
        { name: "Artist A", path: "/a", albumCount: 1, trackCount: 5, totalSize: 0, albums: [] },
      ],
      downloadedPlaylists: [{ playlist: p, downloadedCount: 1, totalCount: 10 }],
      filteredPlaylists: [{ playlist: p, downloadedCount: 1, totalCount: 10 }],
    });

    render(<Home />);

    const playlistList = screen.getByTestId("home-playlist-list");
    const artistList = screen.getByTestId("artist-list");
    expect(playlistList).not.toBeNull();
    expect(artistList).not.toBeNull();

    // Playlist section should appear before artists in DOM
    const allElements = document.querySelectorAll("[data-testid]");
    const playlistIndex = Array.from(allElements).findIndex(
      (el) => el.getAttribute("data-testid") === "home-playlist-list",
    );
    const artistIndex = Array.from(allElements).findIndex(
      (el) => el.getAttribute("data-testid") === "artist-list",
    );
    expect(playlistIndex).toBeLessThan(artistIndex);
  });

  it("hides the playlists section when filteredPlaylists is empty", () => {
    mockUseHomeController.mockReturnValue({
      ...defaultController,
      artists: [
        { name: "Artist A", path: "/a", albumCount: 1, trackCount: 5, totalSize: 0, albums: [] },
      ],
      filteredArtists: [
        { name: "Artist A", path: "/a", albumCount: 1, trackCount: 5, totalSize: 0, albums: [] },
      ],
      downloadedPlaylists: [],
      filteredPlaylists: [],
    });

    render(<Home />);

    expect(screen.queryByTestId("home-playlist-list")).toBeNull();
  });

  it("renders search bar", () => {
    mockUseHomeController.mockReturnValue(defaultController);

    render(<Home />);

    const input = document.querySelector("input[type='text']");
    expect(input).not.toBeNull();
  });

  it("calls handleSearchChange when user types in search bar", () => {
    const handleSearchChange = vi.fn();
    mockUseHomeController.mockReturnValue({
      ...defaultController,
      handleSearchChange,
    });

    render(<Home />);

    const input = document.querySelector("input[type='text']") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "rock" } });
    expect(handleSearchChange).toHaveBeenCalledWith("rock");
  });

  it("shows filtered artists list when artists are present", () => {
    const artist = {
      name: "Rock Band",
      path: "/rb",
      albumCount: 2,
      trackCount: 20,
      totalSize: 0,
      albums: [],
    };
    mockUseHomeController.mockReturnValue({
      ...defaultController,
      artists: [artist],
      filteredArtists: [artist],
    });

    render(<Home />);

    const artistList = screen.getByTestId("artist-list");
    expect(artistList.getAttribute("data-count")).toBe("1");
  });

  it("does not render library stat cards (stats block moved to Dashboard)", () => {
    mockUseHomeController.mockReturnValue({
      ...defaultController,
      stats: { artists: 10, albums: 20, tracks: 100, size: "1.00 GB" },
    });

    render(<Home />);

    expect(screen.queryByTestId("stat-card")).toBeNull();
  });
});
