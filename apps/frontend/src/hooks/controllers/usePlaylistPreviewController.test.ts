import { PlaylistPreview, PlaylistPreviewTracksPage, PlaylistTypeEnum } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaylistPreviewController } from "./usePlaylistPreviewController";

const PLAYLIST_URL = "https://open.spotify.com/playlist/test-id";

const makeTrack = (name: string, trackUrl?: string): PlaylistPreview["tracks"][number] => ({
  name,
  artists: [{ name: "Artist" }],
  album: "Album",
  duration: 180000,
  trackUrl,
});

const makePreview = (overrides: Partial<PlaylistPreview> = {}): PlaylistPreview => ({
  name: "Test Playlist",
  type: PlaylistTypeEnum.Playlist,
  description: null,
  coverUrl: null,
  totalTracks: 3,
  tracks: [makeTrack("Track 1", "https://open.spotify.com/track/1")],
  ...overrides,
});

const mockFetchNextPage = vi.fn();
let mockPreviewData: PlaylistPreview | undefined;
let mockInfiniteData: { pages: PlaylistPreviewTracksPage[] } | undefined;
let mockHasNextPage = false;
let mockIsFetchingNextPage = false;
let mockIsFetching = false;
let mockLastEnabledArg: boolean | undefined;
let mockSearchParams = new URLSearchParams(`url=${encodeURIComponent(PLAYLIST_URL)}`);

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

vi.mock("../queries/usePlaylistPreviewQuery", () => ({
  usePlaylistPreviewQuery: () => ({
    data: mockPreviewData,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../queries/usePlaylistPreviewTracksInfiniteQuery", () => ({
  PLAYLIST_PREVIEW_PAGE_SIZE: 100,
  usePlaylistPreviewTracksInfiniteQuery: (_url: unknown, _offset: unknown, enabled: boolean) => {
    mockLastEnabledArg = enabled;
    return {
      data: mockInfiniteData,
      hasNextPage: mockHasNextPage,
      isFetchingNextPage: mockIsFetchingNextPage,
      isFetching: mockIsFetching,
      fetchNextPage: mockFetchNextPage,
    };
  },
}));

vi.mock("../queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => ({ data: [] }),
}));

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkTrackStatus: () => new Map(),
}));

vi.mock("./usePlaylistController", () => ({
  usePlaylistController: () => ({
    isDownloaded: false,
    isButtonLoading: false,
    hasFailed: false,
    completedCount: 0,
    displayTitle: "Test Playlist",
    handleDownload: vi.fn(),
    handleToggleSubscription: vi.fn(),
    handleDelete: vi.fn(),
    handleRetryFailed: vi.fn(),
    handleRetryTrack: vi.fn(),
  }),
}));

vi.mock("../useNavigationHelpers", () => ({
  useNavigationHelpers: () => ({
    handleGoBack: vi.fn(),
    handleGoHome: vi.fn(),
  }),
}));

describe("usePlaylistPreviewController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreviewData = makePreview();
    mockInfiniteData = undefined;
    mockHasNextPage = false;
    mockIsFetchingNextPage = false;
    mockIsFetching = false;
    mockLastEnabledArg = undefined;
    mockSearchParams = new URLSearchParams(`url=${encodeURIComponent(PLAYLIST_URL)}`);
  });

  it("UPPC-1: initial state — tracks from preview only, hasMoreTracks true before pagination starts, isLoadingMoreTracks false", () => {
    mockHasNextPage = false;
    mockIsFetchingNextPage = false;

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].name).toBe("Track 1");
    expect(result.current.hasMoreTracks).toBe(true);
    expect(result.current.isLoadingMoreTracks).toBe(false);
  });

  it("UPPC-2: hasMoreTracks is false when shouldLoadMore is false (album type)", () => {
    mockPreviewData = makePreview({ type: PlaylistTypeEnum.Album });

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.hasMoreTracks).toBe(false);
  });

  it("UPPC-3: loadMore appends and deduplicates pages from infinite query", () => {
    const page2Track = makeTrack("Track 2", "https://open.spotify.com/track/2");
    const duplicateTrack = makeTrack("Track 1", "https://open.spotify.com/track/1");

    mockInfiniteData = {
      pages: [
        {
          tracks: [page2Track, duplicateTrack],
          total: 3,
          hasMore: false,
          nextOffset: null,
        },
      ],
    };
    mockHasNextPage = false;

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks.map((t) => t.name)).toEqual(["Track 1", "Track 2"]);
  });

  it("UPPC-4: first handleLoadMoreTracks sets paginationStarted, does NOT call fetchNextPage yet", () => {
    mockHasNextPage = false;
    mockIsFetchingNextPage = false;

    const { result } = renderHook(() => usePlaylistPreviewController());

    act(() => {
      result.current.handleLoadMoreTracks();
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it("UPPC-5: second handleLoadMoreTracks calls fetchNextPage when hasNextPage and not fetching", () => {
    mockHasNextPage = true;
    mockIsFetchingNextPage = false;

    const { result } = renderHook(() => usePlaylistPreviewController());

    act(() => {
      result.current.handleLoadMoreTracks();
    });
    act(() => {
      result.current.handleLoadMoreTracks();
    });

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("UPPC-6: handleLoadMoreTracks does nothing when shouldLoadMore is false (album)", () => {
    mockPreviewData = makePreview({ type: PlaylistTypeEnum.Album });

    const { result } = renderHook(() => usePlaylistPreviewController());

    act(() => {
      result.current.handleLoadMoreTracks();
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it("UPPC-7: totalCount uses previewData.totalTracks", () => {
    mockPreviewData = makePreview({ totalTracks: 150 });

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.totalCount).toBe(150);
  });

  it("UPPC-8: URL change produces fresh accumulation (new query key would reset infinite data)", () => {
    const { result, rerender } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.tracks).toHaveLength(1);

    mockSearchParams = new URLSearchParams(
      `url=${encodeURIComponent("https://open.spotify.com/playlist/other-id")}`,
    );
    mockPreviewData = makePreview({
      name: "Other Playlist",
      tracks: [makeTrack("Other Track", "https://open.spotify.com/track/other")],
    });
    mockInfiniteData = undefined;

    rerender();

    expect(result.current.tracks).toHaveLength(1);
    expect(result.current.tracks[0].name).toBe("Other Track");
  });

  it("UPPC-9: isLoadingMoreTracks true when isFetchingNextPage is true", () => {
    mockIsFetchingNextPage = true;

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.isLoadingMoreTracks).toBe(true);
  });

  it("UPPC-10: album type — hasMoreTracks false, query never enabled, handleLoadMoreTracks does nothing", () => {
    mockPreviewData = makePreview({ type: PlaylistTypeEnum.Album, totalTracks: 5 });

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.hasMoreTracks).toBe(false);
    expect(mockLastEnabledArg).toBe(false);

    act(() => {
      result.current.handleLoadMoreTracks();
    });

    expect(mockFetchNextPage).not.toHaveBeenCalled();
    expect(mockLastEnabledArg).toBe(false);
  });

  it("UPPC-11: undefined previewData — tracks empty, hasMoreTracks false, no fetch", () => {
    mockPreviewData = undefined;

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(result.current.tracks).toHaveLength(0);
    expect(result.current.hasMoreTracks).toBe(false);
    expect(mockLastEnabledArg).toBe(false);
  });

  it("UPPC-12: lazy gate — query not enabled on mount; enabled only after first handleLoadMoreTracks", () => {
    mockPreviewData = makePreview({ totalTracks: 150 });

    const { result } = renderHook(() => usePlaylistPreviewController());

    expect(mockLastEnabledArg).toBe(false);

    act(() => {
      result.current.handleLoadMoreTracks();
    });

    expect(mockLastEnabledArg).toBe(true);
    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });

  it("UPPC-13: isLoadingMoreTracks true during initial gated fetch (paginationStarted + isFetching + no data)", () => {
    mockPreviewData = makePreview({ totalTracks: 150 });
    mockIsFetching = true;
    mockInfiniteData = undefined;

    const { result } = renderHook(() => usePlaylistPreviewController());

    act(() => {
      result.current.handleLoadMoreTracks();
    });

    expect(result.current.isLoadingMoreTracks).toBe(true);
  });
});
