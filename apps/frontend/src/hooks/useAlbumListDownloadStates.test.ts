import type { ArtistRelease } from "@spotiarr/shared";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBulkPlaylistStatus } from "@/hooks/queries/useDownloadStatus";
import { useAlbumListDownloadStates } from "./useAlbumListDownloadStates";

// Mock useBulkPlaylistStatus — the hook delegates all logic to it.
vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkPlaylistStatus: vi.fn(),
}));

const mockUseBulkPlaylistStatus = vi.mocked(useBulkPlaylistStatus);

const makeAlbum = (overrides: Partial<ArtistRelease> = {}): ArtistRelease => ({
  artistId: "artist-1",
  artistName: "Test Artist",
  artistImageUrl: null,
  albumId: "album-1",
  albumName: "Test Album",
  coverUrl: null,
  spotifyUrl: "https://open.spotify.com/album/abc",
  totalTracks: 10,
  ...overrides,
});

describe("useAlbumListDownloadStates", () => {
  it("passes the correct status items (url + totalTracks) to useBulkPlaylistStatus", () => {
    const album = makeAlbum();
    const expectedMap = new Map([
      [album.spotifyUrl!, { isDownloaded: false, isDownloading: false }],
    ]);
    mockUseBulkPlaylistStatus.mockReturnValue(expectedMap);

    renderHook(() => useAlbumListDownloadStates([album]));

    expect(mockUseBulkPlaylistStatus).toHaveBeenCalledWith([
      { url: album.spotifyUrl, totalTracks: album.totalTracks },
    ]);
  });

  it("returns the map produced by useBulkPlaylistStatus", () => {
    const album1 = makeAlbum({ albumId: "a1", spotifyUrl: "https://open.spotify.com/album/a1" });
    const album2 = makeAlbum({ albumId: "a2", spotifyUrl: "https://open.spotify.com/album/a2" });

    const expectedMap = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>([
      [album1.spotifyUrl!, { isDownloaded: true, isDownloading: false }],
      [album2.spotifyUrl!, { isDownloaded: false, isDownloading: true }],
    ]);
    mockUseBulkPlaylistStatus.mockReturnValue(expectedMap);

    const { result } = renderHook(() => useAlbumListDownloadStates([album1, album2]));

    expect(result.current).toBe(expectedMap);
  });

  it("returns an empty map when given an empty album list", () => {
    const emptyMap = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();
    mockUseBulkPlaylistStatus.mockReturnValue(emptyMap);

    const { result } = renderHook(() => useAlbumListDownloadStates([]));

    expect(result.current.size).toBe(0);
  });

  it("handles albums without a spotifyUrl by still passing them to useBulkPlaylistStatus", () => {
    const album = makeAlbum({ spotifyUrl: undefined });
    const emptyMap = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();
    mockUseBulkPlaylistStatus.mockReturnValue(emptyMap);

    renderHook(() => useAlbumListDownloadStates([album]));

    expect(mockUseBulkPlaylistStatus).toHaveBeenCalledWith([
      { url: undefined, totalTracks: album.totalTracks },
    ]);
  });

  it("passes totalTracks undefined when not present on the album", () => {
    const album = makeAlbum({ totalTracks: undefined });
    const emptyMap = new Map<string, { isDownloaded: boolean; isDownloading: boolean }>();
    mockUseBulkPlaylistStatus.mockReturnValue(emptyMap);

    renderHook(() => useAlbumListDownloadStates([album]));

    expect(mockUseBulkPlaylistStatus).toHaveBeenCalledWith([
      { url: album.spotifyUrl, totalTracks: undefined },
    ]);
  });
});
