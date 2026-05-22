import type { ArtistRelease } from "@spotiarr/shared";
import { useMemo } from "react";
import { useBulkPlaylistStatus } from "@/contexts/DownloadStatusContext";

interface AlbumDownloadState {
  isDownloaded: boolean;
  isDownloading: boolean;
}

/**
 * Centralizes the download-status Map pattern for album list components.
 * Wraps useBulkPlaylistStatus with ArtistRelease[] mapping.
 * Returns a Map<spotifyUrl, AlbumDownloadState>.
 */
export function useAlbumListDownloadStates(
  albums: ArtistRelease[],
): Map<string, AlbumDownloadState> {
  const statusItems = useMemo(
    () =>
      albums.map((album) => ({
        url: album.spotifyUrl,
        totalTracks: album.totalTracks,
      })),
    [albums],
  );

  return useBulkPlaylistStatus(statusItems);
}
