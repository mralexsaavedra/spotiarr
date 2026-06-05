import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

export type PlaylistDetailMode = "library" | "managed";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useTracksQuery } from "../queries/useTracksQuery";
import { useNavigationHelpers } from "../useNavigationHelpers";
import {
  LocalTrackPlaybackErrorKey,
  useLocalTrackPlaybackController,
} from "./useLocalTrackPlaybackController";
import { usePlaylistController } from "./usePlaylistController";

export type PlaylistPlaybackErrorKey = LocalTrackPlaybackErrorKey<"library.album">;

export const usePlaylistDetailController = () => {
  const { handleGoHome } = useNavigationHelpers();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mode: PlaylistDetailMode = searchParams.get("mode") === "library" ? "library" : "managed";

  const { data: playlists = [], isLoading: isPlaylistsLoading } = usePlaylistsQuery();
  const { data: tracks = [], isLoading: isTracksLoading } = useTracksQuery(id);

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

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
    scopeKey: id ?? "playlist-detail",
    errorKeyPrefix: "library.album",
    getAudioUrl: (track) => track.audioUrl,
  });

  const firstPlayableTrackId = useMemo(
    () => tracks.find((track) => track.audioUrl)?.id ?? null,
    [tracks],
  );

  const hasPlayableTracks = firstPlayableTrackId !== null;

  const onPlayPlaylist = useCallback(() => {
    const targetTrackId = currentTrackId ?? firstPlayableTrackId;

    if (!targetTrackId) {
      return;
    }

    onPlayTrack(targetTrackId);
  }, [currentTrackId, firstPlayableTrackId, onPlayTrack]);

  const {
    isDownloading,
    isDownloaded,
    hasFailed,
    completedCount,
    displayTitle,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    mutations: { retryFailedTracks },
  } = usePlaylistController({
    playlist,
    tracks,
    spotifyUrl: playlist?.spotifyUrl,
    id,
  });

  return {
    playlist,
    tracks,
    isPlaylistsLoading,
    isTracksLoading,
    isDownloading,
    isDownloaded,
    hasFailed,
    completedCount,
    displayTitle,
    retryFailedTracks,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    handleGoHome,
    audioSrc,
    currentTrackId,
    isPlaying,
    playbackError: playbackError as PlaylistPlaybackErrorKey | null,
    setAudioElement,
    onPlayTrack,
    onPauseTrack,
    onPlayPlaylist,
    onPausePlaylist: onPauseTrack,
    onAudioPlay,
    onAudioPause,
    onAudioError,
    hasPlayableTracks,
    mode,
  };
};
