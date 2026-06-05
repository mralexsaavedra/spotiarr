import { ApiRoutes, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { generatePath, useParams } from "react-router-dom";
import { Path } from "@/routes/routes";
import { usePlayerStore, type QueueItem } from "@/store/usePlayerStore";
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

  // Build QueueItem snapshot for dispatch — normalize track.trackUrl → QueueItem.audioUrl
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
    }));
  }, [album, artistName, coverUrl]);

  const currentIndex = usePlayerStore((state) => {
    if (state.currentIndex === null) return null;
    return state.currentIndex;
  });

  const isPlaying = usePlayerStore((state) => state.isPlaying);

  // Derive currentTrackId from store queue
  const currentTrackId = usePlayerStore((state) => {
    if (state.currentIndex === null) return null;
    return state.queue[state.currentIndex]?.id ?? null;
  });

  const onPlayTrack = useCallback(
    (trackId: string) => {
      const startIndex = queueItems.findIndex((item) => item.id === trackId);
      if (startIndex === -1) return;
      usePlayerStore.getState().playQueue(queueItems, startIndex);
    },
    [queueItems],
  );

  const firstPlayableIndex = useMemo(() => {
    if (queueItems.length === 0) return -1;
    return 0; // all tracks in album have audioUrl
  }, [queueItems]);

  const hasPlayableTracks = queueItems.length > 0;

  const onPlayPlaylist = useCallback(() => {
    if (!hasPlayableTracks) return;
    // If currently playing a track in this album, resume; otherwise start from first
    const resolvedIndex = currentIndex !== null ? currentIndex : firstPlayableIndex;
    if (resolvedIndex === -1) return;
    usePlayerStore.getState().playQueue(queueItems, resolvedIndex);
  }, [currentIndex, firstPlayableIndex, hasPlayableTracks, queueItems]);

  const onPauseTrack = useCallback(() => {
    usePlayerStore.getState().togglePlay();
  }, []);

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
