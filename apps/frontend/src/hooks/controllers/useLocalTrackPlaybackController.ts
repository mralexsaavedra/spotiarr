import { SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

const PLAYBACK_ERROR_SUFFIX = {
  BLOCKED: "playbackBlocked",
  FAILED: "playbackFailed",
  UNAVAILABLE: "playbackUnavailable",
  UNSUPPORTED: "playbackUnsupported",
} as const;

type PlaybackErrorSuffix = (typeof PLAYBACK_ERROR_SUFFIX)[keyof typeof PLAYBACK_ERROR_SUFFIX];

export type LocalTrackPlaybackErrorKey<TPrefix extends string> =
  `${TPrefix}.${PlaybackErrorSuffix}`;

interface LocalTrackPlaybackTrack {
  id: string;
}

interface UseLocalTrackPlaybackControllerParams<
  TTrack extends LocalTrackPlaybackTrack,
  TPrefix extends string,
> {
  tracks: TTrack[];
  scopeKey: string;
  errorKeyPrefix: TPrefix;
  getAudioUrl: (track: TTrack) => string | null | undefined;
}

const createPlaybackErrorKey = <TPrefix extends string>(
  prefix: TPrefix,
  suffix: PlaybackErrorSuffix,
): LocalTrackPlaybackErrorKey<TPrefix> =>
  `${prefix}.${suffix}` as LocalTrackPlaybackErrorKey<TPrefix>;

export const useLocalTrackPlaybackController = <
  TTrack extends LocalTrackPlaybackTrack,
  TPrefix extends string,
>({
  tracks,
  scopeKey,
  errorKeyPrefix,
  getAudioUrl,
}: UseLocalTrackPlaybackControllerParams<TTrack, TPrefix>) => {
  const tracksRef = useRef<TTrack[]>(tracks);
  tracksRef.current = tracks;

  const getAudioUrlRef = useRef(getAudioUrl);
  getAudioUrlRef.current = getAudioUrl;

  const [audioElement, setAudioElementState] = useState<HTMLAudioElement | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<LocalTrackPlaybackErrorKey<TPrefix> | null>(
    null,
  );
  const loadedSrcRef = useRef<string | null>(null);
  const playAttemptRef = useRef(0);
  const playbackScopeKeyRef = useRef(scopeKey);

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId) ?? null,
    [tracks, currentTrackId],
  );

  const audioSrc = currentTrack ? (getAudioUrl(currentTrack) ?? null) : null;

  const stopAndClearPlayback = useCallback((element: HTMLAudioElement | null) => {
    loadedSrcRef.current = null;
    element?.pause();
    setCurrentTrackId(null);
    setIsPlaying(false);
  }, []);

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
            setPlaybackError(createPlaybackErrorKey(errorKeyPrefix, PLAYBACK_ERROR_SUFFIX.BLOCKED));
            return;
          }

          if (error.name === "NotSupportedError") {
            setIsPlaying(false);
            setPlaybackError(
              createPlaybackErrorKey(errorKeyPrefix, PLAYBACK_ERROR_SUFFIX.UNSUPPORTED),
            );
            return;
          }
        }

        setIsPlaying(false);
        setPlaybackError(createPlaybackErrorKey(errorKeyPrefix, PLAYBACK_ERROR_SUFFIX.FAILED));
      }
    },
    [errorKeyPrefix],
  );

  const onPlayTrack = useCallback(
    (trackId: string) => {
      const targetTrack = tracksRef.current.find((track) => track.id === trackId);
      const targetSrc = targetTrack ? (getAudioUrlRef.current(targetTrack) ?? null) : null;
      const attemptId = playAttemptRef.current + 1;

      playAttemptRef.current = attemptId;

      if (!targetSrc) {
        stopAndClearPlayback(audioElement);
        setPlaybackError(createPlaybackErrorKey(errorKeyPrefix, PLAYBACK_ERROR_SUFFIX.UNAVAILABLE));
        return;
      }

      setPlaybackError(null);
      setCurrentTrackId(trackId);

      if (audioElement) {
        void playOnElement(audioElement, targetSrc, attemptId);
      }
    },
    [audioElement, errorKeyPrefix, playOnElement, stopAndClearPlayback],
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

  const onAudioError = useCallback(
    (event?: SyntheticEvent<HTMLAudioElement>) => {
      const mediaErrorCode = event?.currentTarget.error?.code;

      setIsPlaying(false);

      if (mediaErrorCode === 4) {
        setPlaybackError(createPlaybackErrorKey(errorKeyPrefix, PLAYBACK_ERROR_SUFFIX.UNAVAILABLE));
        return;
      }

      setPlaybackError(createPlaybackErrorKey(errorKeyPrefix, PLAYBACK_ERROR_SUFFIX.FAILED));
    },
    [errorKeyPrefix],
  );

  useEffect(() => {
    if (!audioElement) {
      return;
    }

    return () => {
      audioElement.pause();
    };
  }, [audioElement]);

  useEffect(() => {
    if (playbackScopeKeyRef.current === scopeKey) {
      return;
    }

    playbackScopeKeyRef.current = scopeKey;
    playAttemptRef.current += 1;
    stopAndClearPlayback(audioElement);
    setPlaybackError(null);
  }, [audioElement, scopeKey, stopAndClearPlayback]);

  return {
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
