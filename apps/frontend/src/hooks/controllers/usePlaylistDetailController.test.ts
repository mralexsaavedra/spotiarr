import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlaylistDetailController } from "./usePlaylistDetailController";

const mockUseParams = vi.fn();
const mockUseSearchParams = vi.fn();
const mockUsePlaylistsQuery = vi.fn();
const mockUseTracksQuery = vi.fn();
const mockUseNavigationHelpers = vi.fn();
const mockUsePlaylistController = vi.fn();
const mockPlayQueue = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useParams: () => mockUseParams(),
    useSearchParams: () => mockUseSearchParams(),
  };
});

vi.mock("../queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => mockUsePlaylistsQuery(),
}));

vi.mock("../queries/useTracksQuery", () => ({
  useTracksQuery: (playlistId: string | undefined) => mockUseTracksQuery(playlistId),
}));

vi.mock("../useNavigationHelpers", () => ({
  useNavigationHelpers: () => mockUseNavigationHelpers(),
}));

vi.mock("./usePlaylistController", () => ({
  usePlaylistController: (params: unknown) => mockUsePlaylistController(params),
}));

vi.mock("@/store/usePlayerStore", () => ({
  usePlayerStore: Object.assign(
    vi.fn(
      (
        selector: (state: {
          isPlaying: boolean;
          currentIndex: number | null;
          queue: Array<{ id: string }>;
        }) => unknown,
      ) => selector({ isPlaying: false, currentIndex: null, queue: [] }),
    ),
    {
      getState: vi.fn(() => ({ playQueue: mockPlayQueue, togglePlay: vi.fn() })),
    },
  ),
}));

const playlist = {
  id: "playlist-1",
  name: "Road Trip",
  type: PlaylistTypeEnum.Playlist,
  spotifyUrl: "https://open.spotify.com/playlist/playlist-1",
  subscribed: true,
  stats: {
    completedCount: 2,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 0,
    activeCount: 0,
    errorCount: 0,
    totalCount: 3,
    progress: 100,
    isDownloading: false,
    hasErrors: false,
    isCompleted: true,
  },
};

const tracks = [
  {
    id: "track-1",
    name: "Intro",
    artist: "Artist 1",
    status: TrackStatusEnum.Completed,
    audioUrl: undefined,
    trackUrl: "https://open.spotify.com/track/1",
    albumCoverUrl: undefined,
  },
  {
    id: "track-2",
    name: "Main Theme",
    artist: "Artist 2",
    status: TrackStatusEnum.Completed,
    audioUrl: "/api/library/audio?path=%2Fmusic%2Fmain-theme.mp3",
    trackUrl: "https://open.spotify.com/track/2",
    albumCoverUrl: "https://example.com/album-cover-track2.jpg",
  },
  {
    id: "track-3",
    name: "Finale",
    artist: "Artist 3",
    status: TrackStatusEnum.Completed,
    audioUrl: "/api/library/audio?path=%2Fmusic%2Ffinale.mp3",
    trackUrl: "https://open.spotify.com/track/3",
    albumCoverUrl: undefined,
  },
];

const playlistWithCover = {
  ...playlist,
  coverUrl: "https://example.com/playlist-cover.jpg",
};

const defaultPlaylistController = {
  isDownloading: false,
  isDownloaded: true,
  hasFailed: false,
  completedCount: 2,
  displayTitle: "Road Trip",
  handleToggleSubscription: vi.fn(),
  handleDelete: vi.fn(),
  handleRetryFailed: vi.fn(),
  handleRetryTrack: vi.fn(),
  mutations: { retryFailedTracks: { isPending: false } },
};

const setupDefaults = (mode = "managed") => {
  mockUseParams.mockReturnValue({ id: "playlist-1" });
  mockUseSearchParams.mockReturnValue([
    new URLSearchParams(mode === "library" ? "mode=library" : ""),
    vi.fn(),
  ]);
  mockUseNavigationHelpers.mockReturnValue({ handleGoHome: vi.fn() });
  mockUsePlaylistsQuery.mockReturnValue({ data: [playlist], isLoading: false });
  mockUseTracksQuery.mockReturnValue({ data: tracks, isLoading: false });
  mockUsePlaylistController.mockReturnValue(defaultPlaylistController);
};

describe("usePlaylistDetailController", () => {
  it("dispatches playQueue to usePlayerStore with normalized QueueItems when in library mode", () => {
    setupDefaults("library");
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayTrack("track-2");
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);

    const [items, startIndex] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; audioUrl: string; name: string; artist: string }>,
      number,
    ];

    // Only tracks with truthy audioUrl are dispatched — track-1 is excluded
    expect(items.length).toBe(2); // track-2 and track-3
    items.forEach((item) => {
      expect(item.audioUrl).toBeTruthy();
    });

    // startIndex should correspond to track-2 in the filtered queue
    expect(startIndex).toBe(0); // track-2 is first in the audioUrl-filtered list
    expect(items[0]!.id).toBe("track-2");
    expect(items[0]!.audioUrl).toBe("/api/library/audio?path=%2Fmusic%2Fmain-theme.mp3");
  });

  it("does NOT dispatch to store when mode is managed (default)", () => {
    setupDefaults("managed");
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayTrack("track-2");
    });

    // managed mode → never dispatches to global store
    expect(mockPlayQueue).not.toHaveBeenCalled();
  });

  it("does NOT dispatch to store for tracks without audioUrl even in library mode", () => {
    setupDefaults("library");
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    // track-1 has no audioUrl — should be a no-op
    act(() => {
      result.current.onPlayTrack("track-1");
    });

    expect(mockPlayQueue).not.toHaveBeenCalled();
  });

  it("dispatches with correct queue for track-3 in library mode", () => {
    setupDefaults("library");
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayTrack("track-3");
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);

    const [items, startIndex] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; audioUrl: string }>,
      number,
    ];

    expect(startIndex).toBe(1); // track-3 is at index 1 in the filtered queue
    expect(items[1]!.id).toBe("track-3");
  });

  it("exposes currentTrackId and isPlaying from store selectors, not local audio state", () => {
    setupDefaults();

    const { result } = renderHook(() => usePlaylistDetailController());

    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    // Does not expose old local-audio properties
    expect("audioSrc" in result.current).toBe(false);
    expect("setAudioElement" in result.current).toBe(false);
    expect("onAudioPlay" in result.current).toBe(false);
    expect("onAudioPause" in result.current).toBe(false);
    expect("onAudioError" in result.current).toBe(false);
    expect("playbackError" in result.current).toBe(false);
  });

  it("onPlayPlaylist in library mode dispatches starting from first playable track", () => {
    setupDefaults("library");
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayPlaylist();
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    const [items, startIndex] = mockPlayQueue.mock.calls[0] as [Array<unknown>, number];
    expect(startIndex).toBe(0);
    expect(items.length).toBe(2); // only tracks with audioUrl
  });

  it("onPlayPlaylist in managed mode is a no-op", () => {
    setupDefaults("managed");
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayPlaylist();
    });

    expect(mockPlayQueue).not.toHaveBeenCalled();
  });

  // T1.1 — artworkUrl resolution
  it("[T1.1-A] uses track.albumCoverUrl when present", () => {
    setupDefaults("library");
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlistWithCover], isLoading: false });
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayTrack("track-2");
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    const [items] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; artworkUrl?: string }>,
      number,
    ];
    // track-2 has albumCoverUrl set
    const track2Item = items.find((i) => i.id === "track-2");
    expect(track2Item?.artworkUrl).toBe("https://example.com/album-cover-track2.jpg");
  });

  it("[T1.1-B] falls back to playlist.coverUrl when track.albumCoverUrl is absent", () => {
    setupDefaults("library");
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlistWithCover], isLoading: false });
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayTrack("track-3");
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    const [items] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; artworkUrl?: string }>,
      number,
    ];
    // track-3 has no albumCoverUrl → falls back to playlist.coverUrl
    const track3Item = items.find((i) => i.id === "track-3");
    expect(track3Item?.artworkUrl).toBe("https://example.com/playlist-cover.jpg");
  });

  it("[T1.1-C] artworkUrl is undefined when both track and playlist have no cover", () => {
    setupDefaults("library");
    // playlist has no coverUrl (use the original playlist fixture)
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlist], isLoading: false });
    mockPlayQueue.mockClear();

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayTrack("track-3");
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    const [items] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; artworkUrl?: string }>,
      number,
    ];
    // track-3 has no albumCoverUrl; playlist has no coverUrl → undefined
    const track3Item = items.find((i) => i.id === "track-3");
    expect(track3Item?.artworkUrl).toBeUndefined();
  });
});
