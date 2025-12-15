import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Path } from "@/routes/routes";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useTracksQuery } from "../queries/useTracksQuery";
import { usePlaylistController } from "./usePlaylistController";

export const usePlaylistDetailController = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: playlists = [], isLoading: isPlaylistsLoading } = usePlaylistsQuery();
  const { data: tracks = [], isLoading: isTracksLoading } = useTracksQuery(id);

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

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

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

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
  };
};
