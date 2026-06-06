import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { type QueueItem } from "@/store/usePlayerStore";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useTracksQuery } from "../queries/useTracksQuery";
import { useNavigationHelpers } from "../useNavigationHelpers";
import { usePlayerQueueBinding } from "../usePlayerQueueBinding";
import { usePlaylistController } from "./usePlaylistController";

export type PlaylistDetailMode = "library" | "managed";

export const usePlaylistDetailController = () => {
  const { handleGoHome } = useNavigationHelpers();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mode: PlaylistDetailMode = searchParams.get("mode") === "library" ? "library" : "managed";

  const { data: playlists = [], isLoading: isPlaylistsLoading } = usePlaylistsQuery();
  const { data: tracks = [], isLoading: isTracksLoading } = useTracksQuery(id);

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

  const queueItems: QueueItem[] = useMemo(() => {
    if (mode !== "library") return [];

    return tracks
      .filter((track) => Boolean(track.audioUrl))
      .map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artist ?? "",
        album: track.album,
        artworkUrl: track.albumCoverUrl ?? playlist?.coverUrl ?? undefined,
        audioUrl: track.audioUrl!,
        durationMs: track.durationMs,
      }));
  }, [mode, tracks]);

  const { currentTrackId, isPlaying, hasPlayableTracks, playFromIndex, onPlayTrack, onPauseTrack } =
    usePlayerQueueBinding(queueItems);

  const onPlayPlaylist = useCallback(() => {
    if (!hasPlayableTracks) return;
    playFromIndex(0);
  }, [hasPlayableTracks, playFromIndex]);

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
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onPauseTrack,
    onPlayPlaylist,
    onPausePlaylist: onPauseTrack,
    hasPlayableTracks,
    mode,
  };
};
