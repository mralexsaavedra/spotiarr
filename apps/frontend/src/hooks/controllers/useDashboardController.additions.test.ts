import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all query hooks including the new history ones
const mockUseLibraryStatsQuery = vi.fn();
const mockUseDownloadHistoryQuery = vi.fn();
const mockUsePlaylistsQuery = vi.fn();
const mockUseRecreatePlaylistMutation = vi.fn();
const mockUseTopTracksQuery = vi.fn();
const mockUseTopArtistsQuery = vi.fn();
const mockUseRecentPlaysQuery = vi.fn();
const mockNavigate = vi.fn();
const mockMutate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
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

vi.mock("@/hooks/queries/useTopTracksQuery", () => ({
  useTopTracksQuery: () => mockUseTopTracksQuery(),
}));

vi.mock("@/hooks/queries/useTopArtistsQuery", () => ({
  useTopArtistsQuery: () => mockUseTopArtistsQuery(),
}));

vi.mock("@/hooks/queries/useRecentPlaysQuery", () => ({
  useRecentPlaysQuery: () => mockUseRecentPlaysQuery(),
}));

vi.mock("@/hooks/controllers/useHomeController", () => ({
  useHomeController: vi.fn(),
}));

const { useDashboardController } = await import("./useDashboardController");

const topTrack = {
  trackUrl: "https://example.com/track.mp3",
  trackName: "Best Track",
  artist: "Best Artist",
  album: null,
  albumCoverUrl: null,
  playCount: 10,
  lastPlayedAt: 1700000000000,
};

const topArtist = {
  artist: "Best Artist",
  playCount: 15,
  lastPlayedAt: 1700000000000,
};

const recentPlay = {
  trackId: "t-1",
  trackUrl: null,
  trackName: "Recent Track",
  artist: "Some Artist",
  album: null,
  playedAt: 1700000001000,
};

describe("useDashboardController — mostListenedProps and recentPlaysProps", () => {
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
    mockUseTopTracksQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseTopArtistsQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseRecentPlaysQuery.mockReturnValue({ data: [], isLoading: false });
  });

  it("exposes mostListenedProps with topTracks and topArtists arrays", () => {
    mockUseTopTracksQuery.mockReturnValue({ data: [topTrack], isLoading: false });
    mockUseTopArtistsQuery.mockReturnValue({ data: [topArtist], isLoading: false });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.mostListenedProps).toBeDefined();
    expect(result.current.mostListenedProps!.topTracks).toEqual([topTrack]);
    expect(result.current.mostListenedProps!.topArtists).toEqual([topArtist]);
  });

  it("mostListenedProps.isLoading is true when either query is loading", () => {
    mockUseTopTracksQuery.mockReturnValue({ data: [], isLoading: true });
    mockUseTopArtistsQuery.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.mostListenedProps!.isLoading).toBe(true);
  });

  it("mostListenedProps.isLoading is false when both queries are done", () => {
    mockUseTopTracksQuery.mockReturnValue({ data: [topTrack], isLoading: false });
    mockUseTopArtistsQuery.mockReturnValue({ data: [topArtist], isLoading: false });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.mostListenedProps!.isLoading).toBe(false);
  });

  it("exposes recentPlaysProps with recentPlays array", () => {
    mockUseRecentPlaysQuery.mockReturnValue({ data: [recentPlay], isLoading: false });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.recentPlaysProps).toBeDefined();
    expect(result.current.recentPlaysProps!.recentPlays).toEqual([recentPlay]);
  });

  it("recentPlaysProps.isLoading reflects the query loading state", () => {
    mockUseRecentPlaysQuery.mockReturnValue({ data: [], isLoading: true });

    const { result } = renderHook(() => useDashboardController());

    expect(result.current.recentPlaysProps!.isLoading).toBe(true);
  });

  it("mostListenedProps has empty arrays when queries return empty", () => {
    const { result } = renderHook(() => useDashboardController());

    expect(result.current.mostListenedProps!.topTracks).toEqual([]);
    expect(result.current.mostListenedProps!.topArtists).toEqual([]);
  });

  it("recentPlaysProps has empty array when query returns empty", () => {
    const { result } = renderHook(() => useDashboardController());

    expect(result.current.recentPlaysProps!.recentPlays).toEqual([]);
  });
});
