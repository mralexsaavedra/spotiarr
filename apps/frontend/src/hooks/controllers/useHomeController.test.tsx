import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/httpClient";
import { PlaylistWithStats } from "@/types";
import { useHomeController } from "./useHomeController";

const mockNavigate = vi.fn();
const mockScanMutateAsync = vi.fn();
const mockStartBackfillMutateAsync = vi.fn();
const mockToast = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

const makePlaylist = (overrides: Partial<PlaylistWithStats> = {}): PlaylistWithStats => ({
  id: "playlist-1",
  name: "My Playlist",
  type: PlaylistTypeEnum.Playlist,
  owner: "test-user",
  coverUrl: "https://example.com/cover.jpg",
  tracks: [
    {
      id: "track-1",
      name: "Track 1",
      artist: "Artist 1",
      status: TrackStatusEnum.Completed,
      playlistId: "playlist-1",
    },
    {
      id: "track-2",
      name: "Track 2",
      artist: "Artist 2",
      status: TrackStatusEnum.Queued,
      playlistId: "playlist-1",
    },
  ],
  stats: {
    completedCount: 1,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 1,
    activeCount: 1,
    errorCount: 0,
    totalCount: 2,
    progress: 50,
    isDownloading: true,
    hasErrors: false,
    isCompleted: false,
  },
  ...overrides,
});

let mockPlaylistsData: PlaylistWithStats[] = [];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("../queries/useLibraryArtistsQuery", () => ({
  useLibraryArtistsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock("../queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => ({ data: mockPlaylistsData }),
}));

vi.mock("../queries/useArtworkBackfillStatusQuery", () => ({
  useArtworkBackfillStatusQuery: () => ({
    data: { status: "idle" },
  }),
}));

vi.mock("../mutations/useScanLibraryMutation", () => ({
  useScanLibraryMutation: () => ({
    mutateAsync: mockScanMutateAsync,
    isPending: false,
  }),
}));

vi.mock("../mutations/useStartArtworkBackfillMutation", () => ({
  useStartArtworkBackfillMutation: () => ({
    mutateAsync: mockStartBackfillMutateAsync,
    isPending: false,
  }),
}));

describe("useHomeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlaylistsData = [];
  });

  it("starts scan first and then starts artwork backfill", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync.mockResolvedValueOnce({ status: "running", runId: "run-1" });

    const { result } = renderHook(() => useHomeController());

    act(() => {
      result.current.handleOpenScanModal();
    });
    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockScanMutateAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockStartBackfillMutateAsync.mock.invocationCallOrder[0],
    );
    await waitFor(() => {
      expect(result.current.isScanModalOpen).toBe(false);
    });
  });

  it("starts scan only when backfill is not selected", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: false });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).not.toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not start backfill when scan fails", async () => {
    mockScanMutateAsync.mockRejectedValueOnce(new Error("scan failed"));

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("surfaces partial failure when scan succeeds but backfill start fails", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync.mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useHomeController());

    act(() => {
      result.current.handleOpenScanModal();
    });
    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockToast.warning).toHaveBeenCalled();
  });

  it("retries backfill without re-running scan after partial failure", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ status: "running", runId: "run-2" });

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockScanMutateAsync).toHaveBeenCalledTimes(1);
    expect(mockStartBackfillMutateAsync).toHaveBeenCalledTimes(2);
  });

  it("shows retry-only success copy when backfill retry succeeds", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ status: "running", runId: "run-2" });

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockToast.success).toHaveBeenLastCalledWith("Artwork backfill started.");
  });

  it("handles conflict as graceful already-running flow", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync.mockRejectedValueOnce(
      new ApiError("artwork_backfill_already_running", "invalid_request", 409),
    );

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockToast.success).toHaveBeenCalledWith(
      "Library scan started. Artwork backfill is already running.",
    );
    expect(result.current.isScanModalOpen).toBe(false);
  });

  it("shows retry-only conflict copy when retry backfill is already running", async () => {
    mockScanMutateAsync.mockResolvedValueOnce({});
    mockStartBackfillMutateAsync
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(
        new ApiError("artwork_backfill_already_running", "invalid_request", 409),
      );

    const { result } = renderHook(() => useHomeController());

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    await act(async () => {
      await result.current.handleConfirmScan({ shouldStartBackfill: true });
    });

    expect(mockToast.success).toHaveBeenLastCalledWith("Artwork backfill is already running.");
    expect(result.current.isScanModalOpen).toBe(false);
  });

  describe("playlists with downloads", () => {
    it("returns downloadedPlaylists with only playlists that have at least one completed track", () => {
      const playlistWithDownloads = makePlaylist({ id: "p1", name: "Has Downloads" });
      const playlistWithoutDownloads = makePlaylist({
        id: "p2",
        name: "No Downloads",
        tracks: [
          {
            id: "track-x",
            name: "Track X",
            artist: "Artist X",
            status: TrackStatusEnum.Queued,
            playlistId: "p2",
          },
        ],
        stats: {
          completedCount: 0,
          downloadingCount: 0,
          searchingCount: 0,
          queuedCount: 1,
          activeCount: 1,
          errorCount: 0,
          totalCount: 1,
          progress: 0,
          isDownloading: true,
          hasErrors: false,
          isCompleted: false,
        },
      });

      mockPlaylistsData = [playlistWithDownloads, playlistWithoutDownloads];

      const { result } = renderHook(() => useHomeController());

      expect(result.current.downloadedPlaylists).toHaveLength(1);
      expect(result.current.downloadedPlaylists[0].playlist.id).toBe("p1");
    });

    it("excludes album/track/artist synthetic playlists from downloadedPlaylists", () => {
      const realPlaylist = makePlaylist({ id: "real", name: "Real Playlist" });
      const albumPlaylist = makePlaylist({
        id: "album-1",
        name: "Quevedo - BUENAS NOCHES",
        type: PlaylistTypeEnum.Album,
      });
      const trackPlaylist = makePlaylist({
        id: "track-1",
        name: "Single Track",
        type: PlaylistTypeEnum.Track,
      });
      const artistPlaylist = makePlaylist({
        id: "artist-1",
        name: "Some Artist",
        type: PlaylistTypeEnum.Artist,
      });

      mockPlaylistsData = [realPlaylist, albumPlaylist, trackPlaylist, artistPlaylist];

      const { result } = renderHook(() => useHomeController());

      expect(result.current.downloadedPlaylists).toHaveLength(1);
      expect(result.current.downloadedPlaylists[0].playlist.id).toBe("real");
    });

    it("returns correct downloadedCount and totalCount per playlist", () => {
      const playlist = makePlaylist({
        id: "p1",
        tracks: [
          {
            id: "t1",
            name: "T1",
            artist: "A",
            status: TrackStatusEnum.Completed,
            playlistId: "p1",
          },
          {
            id: "t2",
            name: "T2",
            artist: "A",
            status: TrackStatusEnum.Completed,
            playlistId: "p1",
          },
          {
            id: "t3",
            name: "T3",
            artist: "A",
            status: TrackStatusEnum.Queued,
            playlistId: "p1",
          },
        ],
        stats: {
          completedCount: 2,
          downloadingCount: 0,
          searchingCount: 0,
          queuedCount: 1,
          activeCount: 1,
          errorCount: 0,
          totalCount: 3,
          progress: 67,
          isDownloading: true,
          hasErrors: false,
          isCompleted: false,
        },
      });
      mockPlaylistsData = [playlist];

      const { result } = renderHook(() => useHomeController());

      expect(result.current.downloadedPlaylists[0].downloadedCount).toBe(2);
      expect(result.current.downloadedPlaylists[0].totalCount).toBe(3);
    });

    it("filters playlists by search term (case-insensitive)", async () => {
      vi.useFakeTimers();
      const p1 = makePlaylist({ id: "p1", name: "Rock Anthems" });
      const p2 = makePlaylist({ id: "p2", name: "Jazz Classics" });
      mockPlaylistsData = [p1, p2];

      const { result } = renderHook(() => useHomeController());

      act(() => {
        result.current.handleSearchChange("rock");
      });
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.filteredPlaylists).toHaveLength(1);
      expect(result.current.filteredPlaylists[0].playlist.name).toBe("Rock Anthems");
      vi.useRealTimers();
    });

    it("filters artists by search term", async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useHomeController());

      act(() => {
        result.current.handleSearchChange("anything");
      });
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.filteredArtists).toHaveLength(0);
      vi.useRealTimers();
    });

    it("returns search state and handleSearchChange", () => {
      const { result } = renderHook(() => useHomeController());

      expect(result.current.search).toBe("");
      act(() => {
        result.current.handleSearchChange("hello");
      });
      expect(result.current.search).toBe("hello");
    });

    it("navigates to playlist detail on handlePlaylistClick", () => {
      const playlist = makePlaylist({ id: "playlist-nav" });
      mockPlaylistsData = [playlist];

      const { result } = renderHook(() => useHomeController());

      act(() => {
        result.current.handlePlaylistClick("playlist-nav");
      });

      expect(mockNavigate).toHaveBeenCalledWith("/playlist/playlist-nav?mode=library");
    });
  });
});
