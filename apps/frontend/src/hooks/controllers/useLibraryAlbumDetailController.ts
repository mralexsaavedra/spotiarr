import { ApiRoutes, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { generatePath, useParams } from "react-router-dom";
import { Path } from "@/routes/routes";
import { Track } from "@/types";
import { useLibraryArtistQuery } from "../queries/useLibraryArtistQuery";

const safeDecodeURIComponent = (value: string | undefined): string => {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const useLibraryAlbumDetailController = () => {
  const { name, albumName } = useParams<{ name: string; albumName: string }>();

  const artistName = safeDecodeURIComponent(name);
  const selectedAlbumName = safeDecodeURIComponent(albumName);

  const { data: artist, isLoading, error } = useLibraryArtistQuery(artistName);

  const album = artist?.albums.find((candidate) => candidate.name === selectedAlbumName);

  const tracks: Track[] =
    album?.tracks.map((track, index) => ({
      id: `${artistName}-${album.name}-${index}`,
      playlistId: album.path,
      name: track.name,
      artist: track.artist,
      artists: [{ name: track.artist, url: undefined }],
      album: track.album,
      durationMs: 0,
      status: TrackStatusEnum.Completed,
      trackUrl: undefined,
      albumUrl: undefined,
    })) ?? [];

  const coverUrl = album?.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(album.image)}`
    : undefined;

  const backToArtistPath = generatePath(Path.LIBRARY_ARTIST, {
    name: artistName,
  });

  return {
    artistName,
    albumName: selectedAlbumName,
    album,
    tracks,
    coverUrl,
    isLoading,
    error,
    isNotFound: !isLoading && !error && (!artist || !album),
    playlistType: PlaylistTypeEnum.Album,
    backToArtistPath,
  };
};
