import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseLibraryStatsQuery = vi.fn();
const mockUseDownloadHistoryQuery = vi.fn();
const mockUsePlaylistsQuery = vi.fn();
const mockUseRecreatePlaylistMutation = vi.fn();
const mockNavigate = vi.fn();
const mockMutate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/queries/useLibraryStatsQuery", () => ({
  useLibraryStatsQuery: () => mockUseLibraryStatsQuery(),
}));

vi.mock("@/hooks/queries/useDownloadHistoryQuery", () => ({
  useDownloadHistoryQuery: () => mockUseDownloadHistoryQuery(),
}));

vi.mock("@/hooks/queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => mockUsePlaylistsQuery(),
}));

vi.mock("@/hooks/mutations/useRecreatePlaylistMutation", () => ({
  useRecreatePlaylistMutation: () => mockUseRecreatePlaylistMutation(),
}));

vi.mock("@/hooks/controllers/useHomeController", () => ({
  useHomeController: vi.fn(),
}));

const { useDashboardController } = await import("./useDashboardController");
const { useHomeController: mockedUseHomeController } =
  await import("@/hooks/controllers/useHomeController");

const makeHistoryItem = (overrides = {}) => ({
  playlistId: "pl-1",
  playlistName: "My Playlist",
  playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
  trackCount: 10,
  lastCompletedAt: Date.now(),
  ...overrides,
});

describe("useDashboardController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLibraryStatsQuery.mockReturnValue({ data: undefined });
    mockUseDownloadHistoryQuery.mockReturnValue({ data: [], isLoading: false });
    mockUsePlaylistsQuery.mockReturnValue({ data: [] });
    mockUseRecreatePlaylistMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      variables: undefined,
    });
  });

  it("does NOT call useHomeController (over-fetch guard)", () => {
    renderHook(() => useDashboardController());
    expect(vi.mocked(mockedUseHomeController)).not.toHaveBeenCalled();
  });

  it("returns null statsProps when query data is undefined", () => {
    mockUseLibraryStatsQuery.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.statsProps).toBeNull();
  });

  it("maps library stats query data to statsProps", () => {
    mockUseLibraryStatsQuery.mockReturnValue({
      data: {
        totalArtists: 120,
        totalAlbums: 430,
        totalTracks: 5200,
        totalSize: 12_884_901_888,
      },
    });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.statsProps).toEqual({
      artists: 120,
      albums: 430,
      tracks: 5200,
      size: "12.00 GB",
    });
  });

  it("returns history and isLoading from download history query", () => {
    const historyItem = makeHistoryItem();
    mockUseDownloadHistoryQuery.mockReturnValue({
      data: [historyItem],
      isLoading: true,
    });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.historyProps.history).toEqual([historyItem]);
    expect(result.current.historyProps.isLoading).toBe(true);
  });

  it("returns activePlaylists from playlists query", () => {
    const playlist = { id: "pl-1", name: "Chill" };
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlist] });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.historyProps.activePlaylists).toEqual([playlist]);
  });

  it("returns recreatingUrl as mutation variables when pending", () => {
    const spotifyUrl = "https://open.spotify.com/playlist/abc";
    mockUseRecreatePlaylistMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      variables: spotifyUrl,
    });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.historyProps.recreatingUrl).toBe(spotifyUrl);
  });

  it("returns recreatingUrl as null when mutation is not pending", () => {
    mockUseRecreatePlaylistMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      variables: undefined,
    });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.historyProps.recreatingUrl).toBeNull();
  });

  it("handleRecreatePlaylistClick calls recreate mutation with spotifyUrl", () => {
    const { result } = renderHook(() => useDashboardController());
    const spotifyUrl = "https://open.spotify.com/playlist/abc";
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.historyProps.onRecreate(event, spotifyUrl);
    });

    expect(mockMutate).toHaveBeenCalledWith(spotifyUrl);
  });

  it("handleRecreatePlaylistClick does nothing when spotifyUrl is null", () => {
    const { result } = renderHook(() => useDashboardController());
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.historyProps.onRecreate(event, null);
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("handleHistoryItemClick navigates to PLAYLIST_DETAIL when activePlaylist is provided", () => {
    const { result } = renderHook(() => useDashboardController());
    const item = makeHistoryItem();
    const activePlaylist = {
      id: "pl-1",
      name: "My Playlist",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    };

    act(() => {
      result.current.historyProps.onItemClick(
        item as Parameters<typeof result.current.historyProps.onItemClick>[0],
        activePlaylist as Parameters<typeof result.current.historyProps.onItemClick>[1],
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining("pl-1"));
  });

  it("handleHistoryItemClick navigates to PLAYLIST_PREVIEW with spotifyUrl when no activePlaylist", () => {
    const { result } = renderHook(() => useDashboardController());
    const item = makeHistoryItem({
      playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
    });

    act(() => {
      result.current.historyProps.onItemClick(
        item as Parameters<typeof result.current.historyProps.onItemClick>[0],
        undefined,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("https://open.spotify.com/playlist/abc")),
    );
  });
});
