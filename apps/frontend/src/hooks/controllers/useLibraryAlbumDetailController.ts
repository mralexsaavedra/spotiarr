import { ApiRoutes, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generatePath, useParams } from "react-router-dom";
import { Path } from "@/routes/routes";
import { Track } from "@/types";
import { useLibraryArtistQuery } from "../queries/useLibraryArtistQuery";

export type LibraryPlaybackErrorKey =
  | "library.album.playbackBlocked"
  | "library.album.playbackFailed"
  | "library.album.playbackUnavailable"
  | "library.album.playbackUnsupported";

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

  const tracksRef = useRef<Track[]>(tracks);
  tracksRef.current = tracks;

  const [audioElement, setAudioElementState] = useState<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<LibraryPlaybackErrorKey | null>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const playAttemptRef = useRef(0);
  const playbackScopeKeyRef = useRef(`${artistName}::${selectedAlbumName}`);

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId) ?? null,
    [tracks, currentTrackId],
  );

  const audioSrc = currentTrack?.trackUrl ?? null;

  const setAudioElement = useCallback((element: HTMLAudioElement | null) => {
    loadedSrcRef.current = element ? loadedSrcRef.current : null;
    setAudioElementState(element);
  }, []);

  const playOnElement = useCallback(
    async (element: HTMLAudioElement | null, src: string | null, attemptId: number) => {
      if (!element || !src) {
        return;
      }

      if (loadedSrcRef.current !== src) {
        element.src = src;
        loadedSrcRef.current = src;
      }

      try {
        const result = element.play();

        if (result && typeof (result as Promise<void>).then === "function") {
          await result;
        }
      } catch (error) {
        if (playAttemptRef.current !== attemptId || loadedSrcRef.current !== src) {
          return;
        }

        if (error instanceof DOMException) {
          if (error.name === "AbortError") {
            return;
          }

          if (error.name === "NotAllowedError") {
            setIsPlaying(false);
            setPlaybackError("library.album.playbackBlocked");
            return;
          }

          if (error.name === "NotSupportedError") {
            setIsPlaying(false);
            setPlaybackError("library.album.playbackUnsupported");
            return;
          }
        }

        setIsPlaying(false);
        setPlaybackError("library.album.playbackFailed");
      }
    },
    [],
  );

  const onPlayTrack = useCallback(
    (trackId: string) => {
      const targetTrack = tracksRef.current.find((track) => track.id === trackId);
      const targetSrc = targetTrack?.trackUrl ?? null;
      const attemptId = playAttemptRef.current + 1;

      playAttemptRef.current = attemptId;

      setPlaybackError(null);
      setCurrentTrackId(trackId);

      if (audioElement) {
        void playOnElement(audioElement, targetSrc, attemptId);
      }
    },
    [audioElement, playOnElement],
  );

  const onPauseTrack = useCallback(() => {
    audioElement?.pause();
    setIsPlaying(false);
  }, [audioElement]);

  const onAudioPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const onAudioPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const onAudioError = useCallback((event?: SyntheticEvent<HTMLAudioElement>) => {
    const mediaErrorCode = event?.currentTarget.error?.code;

    setIsPlaying(false);

    if (mediaErrorCode === 4) {
      setPlaybackError("library.album.playbackUnavailable");
      return;
    }

    setPlaybackError("library.album.playbackFailed");
  }, []);

  useEffect(() => {
    if (!audioElement) {
      return;
    }

    return () => {
      audioElement.pause();
    };
  }, [audioElement]);

  useEffect(() => {
    const nextScopeKey = `${artistName}::${selectedAlbumName}`;

    if (playbackScopeKeyRef.current === nextScopeKey) {
      return;
    }

    playbackScopeKeyRef.current = nextScopeKey;
    playAttemptRef.current += 1;
    loadedSrcRef.current = null;
    audioElement?.pause();
    setCurrentTrackId(null);
    setIsPlaying(false);
    setPlaybackError(null);
  }, [artistName, selectedAlbumName, audioElement]);

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
    playbackError,
    setAudioElement,
    onPlayTrack,
    onPauseTrack,
    onAudioPlay,
    onAudioPause,
    onAudioError,
  };
};
