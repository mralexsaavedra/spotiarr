import { DownloadHistoryItem } from "@spotiarr/shared";
import { useMemo } from "react";
import { Playlist } from "../types/playlist";

export const useArtistStatus = (
  artistSpotifyUrl: string | undefined | null,
  playlists: Playlist[] | undefined,
  downloadTracks: DownloadHistoryItem[] | undefined,
): boolean => {
  return useMemo(() => {
    if (!artistSpotifyUrl) return false;

    const isActive = playlists?.some((p) => p.spotifyUrl === artistSpotifyUrl);
    if (isActive) return true;

    const isHistory = downloadTracks?.some((t) => t.playlistSpotifyUrl === artistSpotifyUrl);
    return !!isHistory;
  }, [artistSpotifyUrl, playlists, downloadTracks]);
};
