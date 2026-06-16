import type { ArtistRelease } from "@spotiarr/shared";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlaylistWithStats } from "@/types";
import { usePlaylistsQuery } from "./queries/usePlaylistsQuery";
import { useAlbumPreviewNavigation } from "./useAlbumPreviewNavigation";

// Must be declared before the module imports that use them.
const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("./queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: vi.fn(),
}));

const mockUsePlaylistsQuery = vi.mocked(usePlaylistsQuery);

// Minimal playlist factory — only fields the hook actually inspects.
const makePlaylist = (id: string, spotifyUrl: string): PlaylistWithStats =>
  ({
    id,
    spotifyUrl,
  }) as PlaylistWithStats;

const makeAlbum = (overrides: Partial<ArtistRelease> = {}): ArtistRelease => ({
  artistId: "artist-1",
  artistName: "Test Artist",
  artistImageUrl: null,
  albumId: "album-abc",
  albumName: "Test Album",
  coverUrl: null,
  spotifyUrl: "https://open.spotify.com/album/abc",
  totalTracks: 10,
  ...overrides,
});

describe("useAlbumPreviewNavigation", () => {
  it("navigates to PLAYLIST_DETAIL when the album is already in the local playlist list", () => {
    const album = makeAlbum();
    const playlist = makePlaylist("playlist-42", album.spotifyUrl!);
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlist] } as ReturnType<
      typeof usePlaylistsQuery
    >);

    const { result } = renderHook(() => useAlbumPreviewNavigation());
    result.current.navigateToAlbumPreview(album);

    expect(mockNavigate).toHaveBeenCalledWith("/playlist/playlist-42");
  });

  it("navigates to ALBUM_DETAIL when the album is not in the local playlist list", () => {
    const album = makeAlbum();
    mockUsePlaylistsQuery.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof usePlaylistsQuery
    >);

    const { result } = renderHook(() => useAlbumPreviewNavigation());
    result.current.navigateToAlbumPreview(album);

    expect(mockNavigate).toHaveBeenCalledWith("/album/artist-1/album-abc");
  });

  it("navigates to ALBUM_DETAIL when the album has no spotifyUrl", () => {
    const album = makeAlbum({ spotifyUrl: undefined });
    mockUsePlaylistsQuery.mockReturnValue({ data: [] } as unknown as ReturnType<
      typeof usePlaylistsQuery
    >);

    const { result } = renderHook(() => useAlbumPreviewNavigation());
    result.current.navigateToAlbumPreview(album);

    expect(mockNavigate).toHaveBeenCalledWith("/album/artist-1/album-abc");
  });

  it("uses the default empty array when usePlaylistsQuery returns undefined data", () => {
    mockUsePlaylistsQuery.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof usePlaylistsQuery
    >);

    const album = makeAlbum();

    const { result } = renderHook(() => useAlbumPreviewNavigation());
    result.current.navigateToAlbumPreview(album);

    // No match → falls through to ALBUM_DETAIL
    expect(mockNavigate).toHaveBeenCalledWith("/album/artist-1/album-abc");
  });

  it("navigates to ALBUM_DETAIL when spotifyUrl is present but no playlist matches", () => {
    const album = makeAlbum({ spotifyUrl: "https://open.spotify.com/album/xyz" });
    const playlist = makePlaylist("p-1", "https://open.spotify.com/album/different");
    mockUsePlaylistsQuery.mockReturnValue({ data: [playlist] } as ReturnType<
      typeof usePlaylistsQuery
    >);

    const { result } = renderHook(() => useAlbumPreviewNavigation());
    result.current.navigateToAlbumPreview(album);

    expect(mockNavigate).toHaveBeenCalledWith("/album/artist-1/album-abc");
  });
});
