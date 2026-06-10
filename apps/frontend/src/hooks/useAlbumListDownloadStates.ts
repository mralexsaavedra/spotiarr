import type { ArtistRelease } from "@spotiarr/shared";
import { useMemo } from "react";
import { useBulkPlaylistStatus } from "@/hooks/queries/useDownloadStatus";

interface AlbumDownloadState {
  isDownloaded: boolean;
  isDownloading: boolean;
}

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
