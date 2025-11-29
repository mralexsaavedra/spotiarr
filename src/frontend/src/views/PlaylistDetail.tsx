import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlaylistActions } from "../components/molecules/PlaylistActions";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { PlaylistView } from "../components/templates/PlaylistView";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { useRetryFailedTracksMutation } from "../hooks/mutations/useRetryFailedTracksMutation";
import { useRetryTrackMutation } from "../hooks/mutations/useRetryTrackMutation";
import { useUpdatePlaylistMutation } from "../hooks/mutations/useUpdatePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useTracksQuery } from "../hooks/queries/useTracksQuery";
import { Path } from "../routes/routes";

export const PlaylistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: playlists = [], isLoading: isPlaylistsLoading } = usePlaylistsQuery();
  const updatePlaylist = useUpdatePlaylistMutation();
  const deletePlaylist = useDeletePlaylistMutation();
  const retryFailedTracks = useRetryFailedTracksMutation();
  const { data: tracks = [], isLoading: isTracksLoading } = useTracksQuery(id || "");
  const { mutate: retryTrack } = useRetryTrackMutation(id || "");

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

  const { hasFailed } = useMemo(() => {
    const failed = tracks.some((t) => t.status === TrackStatusEnum.Error);

    return {
      hasFailed: failed,
    };
  }, [tracks]);

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  const handleToggleActive = useCallback(() => {
    if (!playlist) return;
    updatePlaylist.mutate({
      id: playlist.id,
      data: { subscribed: !playlist.subscribed },
    });
  }, [updatePlaylist, playlist]);

  const handleDelete = useCallback(() => {
    if (!playlist) return;
    if (window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      deletePlaylist.mutate(playlist.id);
      navigate(Path.HOME);
    }
  }, [deletePlaylist, playlist, navigate]);

  const handleRetryFailed = useCallback(() => {
    if (!playlist || !hasFailed) return;
    retryFailedTracks.mutate(playlist.id);
  }, [hasFailed, retryFailedTracks, playlist]);

  const handleRetryTrack = useCallback(
    (trackId: string) => {
      retryTrack(trackId);
    },
    [retryTrack],
  );

  if (!playlist) {
    if (isPlaylistsLoading) {
      return <PlaylistSkeleton />;
    }
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <PlaylistView
      title={playlist.name || "Unnamed Playlist"}
      type={playlist.type || "playlist"}
      coverUrl={playlist.coverUrl || null}
      actions={
        <PlaylistActions
          isSubscribed={!!playlist.subscribed}
          hasFailed={hasFailed}
          isRetrying={retryFailedTracks.isPending}
          onToggleSubscription={handleToggleActive}
          onRetryFailed={handleRetryFailed}
          onDelete={handleDelete}
          spotifyUrl={playlist.spotifyUrl}
        />
      }
      tracks={tracks}
      isLoading={isTracksLoading}
      error={null}
      onGoBack={handleGoHome}
      onRetryTrack={handleRetryTrack}
    />
  );
};
