import { TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/types";
import { usePlaylistController } from "./usePlaylistController";

// Mock all mutation hooks
const mockCreatePlaylistMutate = vi.fn();
const mockRetryTrackMutate = vi.fn();
const mockRetryFailedTracksMutate = vi.fn();
const mockUpdatePlaylistMutate = vi.fn();
const mockDeletePlaylistMutate = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../mutations/useCreatePlaylistMutation", () => ({
  useCreatePlaylistMutation: () => ({
    mutate: mockCreatePlaylistMutate,
    isPending: false,
    isSuccess: false,
  }),
}));

vi.mock("../mutations/useRetryTrackMutation", () => ({
  useRetryTrackMutation: () => ({
    mutate: mockRetryTrackMutate,
    isPending: false,
  }),
}));

vi.mock("../mutations/useRetryFailedTracksMutation", () => ({
  useRetryFailedTracksMutation: () => ({
    mutate: mockRetryFailedTracksMutate,
    isPending: false,
  }),
}));

vi.mock("../mutations/useUpdatePlaylistMutation", () => ({
  useUpdatePlaylistMutation: () => ({
    mutate: mockUpdatePlaylistMutate,
    isPending: false,
  }),
}));

vi.mock("../mutations/useDeletePlaylistMutation", () => ({
  useDeletePlaylistMutation: () => ({
    mutate: mockDeletePlaylistMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  usePlaylistDownloading: () => false,
  usePlaylistDownloaded: () => false,
}));

function makeSyntheticTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "preview-track-1",
    name: "Test Track",
    artist: "Test Artist",
    status: TrackStatusEnum.Error,
    trackUrl: "https://open.spotify.com/track/track-id",
    ...overrides,
  };
}

describe("usePlaylistController — handleRetryTrack", () => {
  const PLAYLIST_URL = "https://open.spotify.com/playlist/parent-id";
  const ALBUM_URL = "https://open.spotify.com/album/album-id";
  const TRACK_URL = "https://open.spotify.com/track/track-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PCT-1: synthetic track + playlist parent spotifyUrl → dispatches playlistTrack kind", () => {
    const track = makeSyntheticTrack({ trackUrl: TRACK_URL });

    const { result } = renderHook(() =>
      usePlaylistController({
        tracks: [track],
        spotifyUrl: PLAYLIST_URL,
      }),
    );

    act(() => {
      result.current.handleRetryTrack(track);
    });

    expect(mockCreatePlaylistMutate).toHaveBeenCalledWith({
      kind: "playlistTrack",
      parentSpotifyUrl: PLAYLIST_URL,
      trackUrl: TRACK_URL,
    });
    expect(mockRetryTrackMutate).not.toHaveBeenCalled();
  });

  it("PCT-2: synthetic track + non-playlist parent (album URL) → dispatches spotifyUrl kind", () => {
    const track = makeSyntheticTrack({ trackUrl: TRACK_URL });

    const { result } = renderHook(() =>
      usePlaylistController({
        tracks: [track],
        spotifyUrl: ALBUM_URL,
      }),
    );

    act(() => {
      result.current.handleRetryTrack(track);
    });

    expect(mockCreatePlaylistMutate).toHaveBeenCalledWith({
      kind: "spotifyUrl",
      spotifyUrl: TRACK_URL,
    });
    expect(mockRetryTrackMutate).not.toHaveBeenCalled();
  });

  it("PCT-3: non-synthetic track → calls retryTrack(track.id), no createPlaylist", () => {
    const track = makeSyntheticTrack({ id: "real-db-id-abc" });

    const { result } = renderHook(() =>
      usePlaylistController({
        tracks: [track],
        spotifyUrl: PLAYLIST_URL,
      }),
    );

    act(() => {
      result.current.handleRetryTrack(track);
    });

    expect(mockRetryTrackMutate).toHaveBeenCalledWith("real-db-id-abc");
    expect(mockCreatePlaylistMutate).not.toHaveBeenCalled();
  });
});

describe("usePlaylistController — handleRetryFailed", () => {
  const PLAYLIST_URL = "https://open.spotify.com/playlist/parent-id";
  const TRACK_URL_1 = "https://open.spotify.com/track/track-1";
  const TRACK_URL_2 = "https://open.spotify.com/track/track-2";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PCT-4: handleRetryFailed from playlist preview → each failed synthetic track dispatches playlistTrack with same parentSpotifyUrl", () => {
    const failedTrack1 = makeSyntheticTrack({ id: "preview-1", trackUrl: TRACK_URL_1 });
    const failedTrack2 = makeSyntheticTrack({ id: "preview-2", trackUrl: TRACK_URL_2 });

    const { result } = renderHook(() =>
      usePlaylistController({
        tracks: [failedTrack1, failedTrack2],
        spotifyUrl: PLAYLIST_URL,
      }),
    );

    act(() => {
      result.current.handleRetryFailed();
    });

    expect(mockCreatePlaylistMutate).toHaveBeenCalledTimes(2);
    expect(mockCreatePlaylistMutate).toHaveBeenCalledWith({
      kind: "playlistTrack",
      parentSpotifyUrl: PLAYLIST_URL,
      trackUrl: TRACK_URL_1,
    });
    expect(mockCreatePlaylistMutate).toHaveBeenCalledWith({
      kind: "playlistTrack",
      parentSpotifyUrl: PLAYLIST_URL,
      trackUrl: TRACK_URL_2,
    });
    expect(mockRetryFailedTracksMutate).not.toHaveBeenCalled();
  });

  it("PCT-5: handleRetryFailed with id && hasFailed → calls retryFailedTracks.mutate(id) only", () => {
    const failedTrack = makeSyntheticTrack({ id: "preview-1", trackUrl: TRACK_URL_1 });

    const { result } = renderHook(() =>
      usePlaylistController({
        id: "playlist-db-id",
        tracks: [failedTrack],
        spotifyUrl: PLAYLIST_URL,
      }),
    );

    act(() => {
      result.current.handleRetryFailed();
    });

    expect(mockRetryFailedTracksMutate).toHaveBeenCalledWith("playlist-db-id");
    expect(mockCreatePlaylistMutate).not.toHaveBeenCalled();
  });
});
