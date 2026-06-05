import { ApiRoutes, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { generatePath, useParams } from "react-router-dom";
import { Path } from "@/routes/routes";
import { Track } from "@/types";
import { useLibraryArtistQuery } from "../queries/useLibraryArtistQuery";
import {
  LocalTrackPlaybackErrorKey,
  useLocalTrackPlaybackController,
} from "./useLocalTrackPlaybackController";

export type LibraryPlaybackErrorKey = LocalTrackPlaybackErrorKey<"library.album">;

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

  const {
    audioSrc,
    currentTrackId,
    isPlaying,
    playbackError,
    setAudioElement,
    onPlayTrack,
    onPauseTrack,
    onAudioPlay,
    onAudioPause,
    onAudioError,
  } = useLocalTrackPlaybackController({
    tracks,
    scopeKey: `${artistName}::${selectedAlbumName}`,
    errorKeyPrefix: "library.album",
    getAudioUrl: (track) => track.trackUrl,
  });

  const firstPlayableTrackId = useMemo(
    () => tracks.find((track) => track.trackUrl)?.id ?? null,
    [tracks],
  );

  const hasPlayableTracks = firstPlayableTrackId !== null;

  const onPlayPlaylist = useCallback(() => {
    const targetTrackId = currentTrackId ?? firstPlayableTrackId;
    if (!targetTrackId) return;
    onPlayTrack(targetTrackId);
  }, [currentTrackId, firstPlayableTrackId, onPlayTrack]);

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
    audioSrc,
    currentTrackId,
    isPlaying,
    playbackError: playbackError as LibraryPlaybackErrorKey | null,
    setAudioElement,
    onPlayTrack,
    onPauseTrack,
    onAudioPlay,
    onAudioPause,
    onAudioError,
    hasPlayableTracks,
    onPlayPlaylist,
    onPausePlaylist: onPauseTrack,
  };
};
