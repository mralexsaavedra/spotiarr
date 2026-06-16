import type { SpotifySearchResults } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TopResultItem } from "@/components/molecules/SearchTopResultCard";
import type { FilterTab } from "@/hooks/controllers/useSearchController";
import { Search } from "./Search";

const mockUseSearchController = vi.fn();

vi.mock("@/hooks/controllers/useSearchController", () => ({
  useSearchController: () => mockUseSearchController(),
  SEARCH_TABS: [
    { key: "all", labelKey: "cards.albumTypes.all" },
    { key: "tracks", labelKey: "tracks" },
    { key: "artists", labelKey: "artists" },
    { key: "albums", labelKey: "albums" },
  ],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/ArtistCard", () => ({
  ArtistCard: ({ name }: { name: string }) => <div data-testid="artist-card">{name}</div>,
}));

vi.mock("@/components/molecules/SearchTopResultCard", () => ({
  SearchTopResultCard: () => <div data-testid="top-result-card" />,
}));

vi.mock("@/components/organisms/SearchAlbumGrid", () => ({
  SearchAlbumGrid: () => <div data-testid="album-grid" />,
  SearchAlbumItem: () => <div data-testid="album-item" />,
}));

vi.mock("@/components/organisms/SearchArtistGrid", () => ({
  SearchArtistGrid: () => <div data-testid="artist-grid" />,
}));

vi.mock("@/components/organisms/SearchGridSection", () => ({
  SearchGridSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="grid-section">{children}</div>
  ),
}));

vi.mock("@/components/organisms/SearchTrackList", () => ({
  SearchTrackList: () => <div data-testid="track-list" />,
}));

const noop = vi.fn();

const baseController = {
  query: "",
  results: null as SpotifySearchResults | null | undefined,
  isLoading: false,
  hasResults: false,
  activeTab: "all" as FilterTab,
  setActiveTab: noop,
  topResult: null as TopResultItem | null,
  topTracks: [] as SpotifySearchResults["tracks"],
  topAlbums: [] as SpotifySearchResults["albums"],
  topAlbumsStatusMap: new Map<string, { isDownloaded: boolean; isDownloading: boolean }>(),
  handleDownloadTrack: noop,
  handleAlbumClick: noop,
  handleDownloadAlbum: noop,
  handleArtistClick: noop,
  handleTopResultClick: noop,
};

describe("Search", () => {
  it("renders the empty state when query is empty", () => {
    mockUseSearchController.mockReturnValue({
      ...baseController,
      query: "",
    });

    render(<Search />);

    expect(screen.getByText("search.emptyState")).toBeTruthy();
    expect(screen.queryByTestId("loading")).toBeNull();
    expect(screen.queryByTestId("track-list")).toBeNull();
  });

  it("renders the loading spinner when a query is active and isLoading is true", () => {
    mockUseSearchController.mockReturnValue({
      ...baseController,
      query: "radiohead",
      isLoading: true,
    });

    render(<Search />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByText("search.noResults")).toBeNull();
  });

  it("renders the no-results message when query has no results", () => {
    mockUseSearchController.mockReturnValue({
      ...baseController,
      query: "zzzzzunknown",
      isLoading: false,
      hasResults: false,
    });

    render(<Search />);

    expect(screen.getByText("search.noResults")).toBeTruthy();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("renders filter tab buttons", () => {
    mockUseSearchController.mockReturnValue(baseController);

    render(<Search />);

    // Four tab buttons from SEARCH_TABS
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("calls setActiveTab when a tab button is clicked", () => {
    const setActiveTab = vi.fn();
    mockUseSearchController.mockReturnValue({
      ...baseController,
      setActiveTab,
    });

    render(<Search />);

    const buttons = screen.getAllByRole("button");
    // Click second tab ("tracks")
    fireEvent.click(buttons[1]);
    expect(setActiveTab).toHaveBeenCalledWith("tracks");
  });

  it("renders top result and track list in 'all' tab when results are available", () => {
    mockUseSearchController.mockReturnValue({
      ...baseController,
      query: "adele",
      isLoading: false,
      hasResults: true,
      activeTab: "all" as FilterTab,
      topResult: {
        type: "artist",
        data: { id: "a1", name: "Adele", image: null, spotifyUrl: undefined },
      } as TopResultItem,
      topTracks: [
        {
          id: "t1",
          name: "Hello",
          artist: "Adele",
          artists: [],
          trackUrl: "https://open.spotify.com/track/1",
          albumUrl: null,
          spotifyUrl: "https://open.spotify.com/track/1",
        },
      ],
      results: {
        tracks: [],
        albums: [],
        artists: [],
      },
    });

    render(<Search />);

    expect(screen.getByTestId("top-result-card")).toBeTruthy();
    expect(screen.getByTestId("track-list")).toBeTruthy();
  });

  it("renders the query heading when query is non-empty", () => {
    mockUseSearchController.mockReturnValue({
      ...baseController,
      query: "beatles",
      isLoading: false,
      hasResults: false,
    });

    render(<Search />);

    expect(screen.getByText(/"beatles"/)).toBeTruthy();
  });
});
