import { PlaylistTypeEnum } from "@spotiarr/shared";
import { useMemo } from "react";
import { Track } from "../types/track";

export const usePlaylistTitle = (rawTitle: string, type: string, tracks: Track[]): string => {
  return useMemo(() => {
    if (!rawTitle) return "Unnamed Playlist";

    const typeLower = type.toLowerCase();

    if (typeLower === PlaylistTypeEnum.Album) {
      if (tracks.length > 0 && tracks[0].album) {
        return tracks[0].album;
      }
      const parts = rawTitle.split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : rawTitle;
    }

    if (typeLower === PlaylistTypeEnum.Track) {
      if (tracks.length > 0 && tracks[0].name) {
        return tracks[0].name;
      }
      const parts = rawTitle.split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : rawTitle;
    }

    return rawTitle;
  }, [rawTitle, type, tracks]);
};
