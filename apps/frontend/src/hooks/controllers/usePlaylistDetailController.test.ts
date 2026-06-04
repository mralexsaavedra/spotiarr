import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePlaylistDetailController } from "./usePlaylistDetailController";

const mockUseParams = vi.fn();
const mockUsePlaylistsQuery = vi.fn();
const mockUseTracksQuery = vi.fn();
const mockUseNavigationHelpers = vi.fn();
const mockUsePlaylistController = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useParams: () => mockUseParams(),
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
  },
  {
    id: "track-2",
    name: "Main Theme",
    artist: "Artist 2",
    status: TrackStatusEnum.Completed,
    audioUrl: "/api/library/audio?path=%2Fmusic%2Fmain-theme.mp3",
    trackUrl: "https://open.spotify.com/track/2",
  },
  {
    id: "track-3",
    name: "Finale",
    artist: "Artist 3",
    status: TrackStatusEnum.Completed,
    audioUrl: "/api/library/audio?path=%2Fmusic%2Ffinale.mp3",
    trackUrl: "https://open.spotify.com/track/3",
  },
];

describe("usePlaylistDetailController", () => {
  it("starts playlist playback from the first playable track and exposes local playback state", () => {
    mockUseParams.mockReturnValue({ id: "playlist-1" });
    mockUseNavigationHelpers.mockReturnValue({ handleGoHome: vi.fn() });
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlist], isLoading: false });
    mockUseTracksQuery.mockReturnValue({ data: tracks, isLoading: false });
    mockUsePlaylistController.mockReturnValue({
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
    });

    const { result } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.onPlayPlaylist();
    });

    expect(result.current.hasPlayableTracks).toBe(true);
    expect(result.current.currentTrackId).toBe("track-2");
    expect(result.current.audioSrc).toBe(tracks[1]?.audioUrl);
    expect(typeof result.current.onPlayTrack).toBe("function");
    expect(typeof result.current.onPauseTrack).toBe("function");
  });

  it("resets scoped playback when the playlist route changes", () => {
    mockUseNavigationHelpers.mockReturnValue({ handleGoHome: vi.fn() });
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlist], isLoading: false });
    mockUseTracksQuery.mockReturnValue({ data: tracks, isLoading: false });
    mockUsePlaylistController.mockReturnValue({
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
    });

    const pause = vi.fn();
    const audioElement = { pause } as unknown as HTMLAudioElement;

    mockUseParams.mockReturnValue({ id: "playlist-1" });
    const { result, rerender } = renderHook(() => usePlaylistDetailController());

    act(() => {
      result.current.setAudioElement(audioElement);
      result.current.onPlayTrack("track-2");
      result.current.onAudioPlay();
    });

    expect(result.current.currentTrackId).toBe("track-2");
    expect(result.current.isPlaying).toBe(true);

    mockUseParams.mockReturnValue({ id: "playlist-2" });
    mockUsePlaylistsQuery.mockReturnValue({
      data: [{ ...playlist, id: "playlist-2", name: "Night Drive" }],
      isLoading: false,
    });
    mockUseTracksQuery.mockReturnValue({ data: tracks.slice(1), isLoading: false });

    rerender();

    expect(pause).toHaveBeenCalledTimes(1);
    expect(result.current.currentTrackId).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });
});
