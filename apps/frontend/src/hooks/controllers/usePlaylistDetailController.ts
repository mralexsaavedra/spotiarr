import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { usePlayerStore, type QueueItem } from "@/store/usePlayerStore";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useTracksQuery } from "../queries/useTracksQuery";
import { useNavigationHelpers } from "../useNavigationHelpers";
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

  // Build queue from tracks that have a truthy audioUrl (library-mode dispatch only)
  const queueItems: QueueItem[] = useMemo(() => {
    if (mode !== "library") return [];

    return tracks
      .filter((track) => Boolean(track.audioUrl))
      .map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artist ?? "",
        album: track.album,
        artworkUrl: undefined,
        audioUrl: track.audioUrl!,
        durationMs: track.durationMs,
      }));
  }, [mode, tracks]);

  const firstPlayableTrackId = useMemo(
    () => tracks.find((track) => track.audioUrl)?.id ?? null,
    [tracks],
  );

  const hasPlayableTracks = firstPlayableTrackId !== null;

  const onPlayTrack = useCallback(
    (trackId: string) => {
      if (mode !== "library") return;

      const startIndex = queueItems.findIndex((item) => item.id === trackId);
      if (startIndex === -1) return; // track has no audioUrl or not found

      usePlayerStore.getState().playQueue(queueItems, startIndex);
    },
    [mode, queueItems],
  );

  const onPauseTrack = useCallback(() => {
    usePlayerStore.getState().togglePlay();
  }, []);

  const onPlayPlaylist = useCallback(() => {
    if (mode !== "library" || queueItems.length === 0) return;
    usePlayerStore.getState().playQueue(queueItems, 0);
  }, [mode, queueItems]);

  const currentTrackId = usePlayerStore((state) => {
    if (state.currentIndex === null) return null;
    return state.queue[state.currentIndex]?.id ?? null;
  });

  const isPlaying = usePlayerStore((state) => state.isPlaying);

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
