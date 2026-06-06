import { ApiRoutes, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { generatePath, useParams } from "react-router-dom";
import { Path } from "@/routes/routes";
import { type QueueItem } from "@/store/usePlayerStore";
import { Track } from "@/types";
import { useLibraryArtistQuery } from "../queries/useLibraryArtistQuery";
import { usePlayerQueueBinding } from "../usePlayerQueueBinding";

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

  const tracks: Track[] = useMemo(() => {
    if (!album) {
      return [];
    }

    return album.tracks.map((track, index) => ({
      id: `${artistName}-${album.name}-${index}`,
      playlistId: album.path,
      name: track.name,
      artist: track.artist,
      artists: [{ name: track.artist, url: undefined }],
      album: track.album,
      durationMs: track.duration ? track.duration * 1000 : 0,
      status: TrackStatusEnum.Completed,
      trackUrl: `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/audio?path=${encodeURIComponent(track.filePath)}`,
      albumUrl: undefined,
    }));
  }, [album, artistName]);

  const coverUrl = album?.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(album.image)}`
    : undefined;

  const queueItems: QueueItem[] = useMemo(() => {
    if (!album) return [];

    return album.tracks.map((track, index) => ({
      id: `${artistName}-${album.name}-${index}`,
      name: track.name,
      artist: track.artist,
      album: track.album,
      artworkUrl: coverUrl,
      audioUrl: `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/audio?path=${encodeURIComponent(track.filePath)}`,
      durationMs: track.duration ? track.duration * 1000 : undefined,
      contextPath: generatePath(Path.LIBRARY_ALBUM, {
        name: artistName,
        albumName: selectedAlbumName,
      }),
    }));
  }, [album, artistName, coverUrl, selectedAlbumName]);

  const {
    currentIndex,
    currentTrackId,
    isPlaying,
    hasPlayableTracks,
    playFromIndex,
    onPlayTrack,
    onPauseTrack,
  } = usePlayerQueueBinding(queueItems);

  const onPlayPlaylist = useCallback(() => {
    if (!hasPlayableTracks) return;
    playFromIndex(currentIndex ?? 0);
  }, [currentIndex, hasPlayableTracks, playFromIndex]);

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
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onPauseTrack,
    hasPlayableTracks,
    onPlayPlaylist,
    onPausePlaylist: onPauseTrack,
  };
};
