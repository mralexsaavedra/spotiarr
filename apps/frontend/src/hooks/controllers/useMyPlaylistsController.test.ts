import { PlaylistTypeEnum, SpotifyPlaylist } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { PlaylistWithStats } from "@/types";
import { useMyPlaylistsController } from "./useMyPlaylistsController";

const mockNavigate = vi.fn();
const mockUseMyPlaylistsQuery = vi.fn();
const mockUsePlaylistsQuery = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/queries/useMyPlaylistsQuery", () => ({
  useMyPlaylistsQuery: () => mockUseMyPlaylistsQuery(),
}));

vi.mock("@/hooks/queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => mockUsePlaylistsQuery(),
}));

vi.mock("../useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

const spotifyPlaylist: SpotifyPlaylist = {
  id: "spotify-playlist-1",
  name: "Road Trip",
  image: null,
  owner: "Alex",
  tracks: 12,
  spotifyUrl: "https://open.spotify.com/playlist/road-trip",
};

const savedPlaylist: PlaylistWithStats = {
  id: "saved-playlist-1",
  name: "Road Trip",
  type: PlaylistTypeEnum.Playlist,
  spotifyUrl: spotifyPlaylist.spotifyUrl,
  subscribed: true,
  tracks: [],
  stats: {
    completedCount: 0,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 0,
    activeCount: 0,
    errorCount: 0,
    totalCount: 0,
    progress: 0,
    isDownloading: false,
    hasErrors: false,
    isCompleted: false,
  },
};

describe("useMyPlaylistsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMyPlaylistsQuery.mockReturnValue({
      data: [spotifyPlaylist],
      isLoading: false,
      error: null,
    });
    mockUsePlaylistsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it("navigates to saved playlist detail when the playlist already exists", () => {
    mockUsePlaylistsQuery.mockReturnValue({
      data: [savedPlaylist],
      isLoading: false,
    });

    const { result } = renderHook(() => useMyPlaylistsController());

    act(() => {
      result.current.handlePlaylistClick(spotifyPlaylist.id);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Path.PLAYLIST_DETAIL.replace(":id", savedPlaylist.id),
    );
  });

  it("routes partially-downloaded unsubscribed saved playlists to the preview, not detail", () => {
    const partial: PlaylistWithStats = {
      ...savedPlaylist,
      subscribed: false,
      stats: { ...savedPlaylist.stats, completedCount: 1, totalCount: 187 },
    };
    mockUsePlaylistsQuery.mockReturnValue({ data: [partial], isLoading: false });

    const { result } = renderHook(() => useMyPlaylistsController());

    act(() => {
      result.current.handlePlaylistClick(spotifyPlaylist.id);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(spotifyPlaylist.spotifyUrl)}`,
    );
  });

  it("routes fully-downloaded saved playlists to detail even when unsubscribed", () => {
    const full: PlaylistWithStats = {
      ...savedPlaylist,
      subscribed: false,
      stats: { ...savedPlaylist.stats, completedCount: 12, totalCount: 12 },
    };
    mockUsePlaylistsQuery.mockReturnValue({ data: [full], isLoading: false });

    const { result } = renderHook(() => useMyPlaylistsController());

    act(() => {
      result.current.handlePlaylistClick(spotifyPlaylist.id);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Path.PLAYLIST_DETAIL.replace(":id", savedPlaylist.id),
    );
  });

  it("falls back to playlist preview when the playlist is not saved", () => {
    const { result } = renderHook(() => useMyPlaylistsController());

    act(() => {
      result.current.handlePlaylistClick(spotifyPlaylist.id);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(spotifyPlaylist.spotifyUrl)}`,
    );
  });
});
