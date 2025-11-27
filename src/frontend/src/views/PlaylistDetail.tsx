import { FC, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlaylistActions } from "../components/PlaylistActions";
import { PlaylistNotFound } from "../components/PlaylistNotFound";
import { TrackActions } from "../components/TrackActions";
import { TrackListItem } from "../components/TrackListItem";
import { TrackStatusBadge } from "../components/TrackStatusBadge";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { useDeleteTrackMutation } from "../hooks/mutations/useDeleteTrackMutation";
import { useRetryFailedTracksMutation } from "../hooks/mutations/useRetryFailedTracksMutation";
import { useRetryTrackMutation } from "../hooks/mutations/useRetryTrackMutation";
import { useUpdatePlaylistMutation } from "../hooks/mutations/useUpdatePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useTracksQuery } from "../hooks/queries/useTracksQuery";
import { PlaylistLayout } from "../layouts/PlaylistLayout";
import { Path } from "../routes/routes";
import { TrackStatus } from "../types/track";

export const PlaylistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: playlists = [] } = usePlaylistsQuery();
  const updatePlaylist = useUpdatePlaylistMutation();
  const deletePlaylist = useDeletePlaylistMutation();
  const retryFailedTracks = useRetryFailedTracksMutation();
  const { data: tracks = [] } = useTracksQuery(id || "");
  const retryTrack = useRetryTrackMutation(id || "");
  const deleteTrack = useDeleteTrackMutation(id || "");

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

  const { completedCount, totalCount, hasFailed } = useMemo(() => {
    const completed = tracks.filter((t) => t.status === TrackStatus.Completed).length;
    const failed = tracks.some((t) => t.status === TrackStatus.Error);
    return {
      completedCount: completed,
      totalCount: tracks.length,
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
      retryTrack.mutate(trackId);
    },
    [retryTrack],
  );

  const handleDeleteTrack = useCallback(
    (trackId: string) => {
      deleteTrack.mutate(trackId);
    },
    [deleteTrack],
  );

  if (!playlist) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <PlaylistLayout
      coverUrl={playlist.coverUrl || null}
      name={playlist.name || "Unnamed Playlist"}
      description={`${completedCount} downloaded (${totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)`}
      totalTracks={totalCount}
      type="Playlist"
      spotifyUrl={playlist.spotifyUrl}
      actions={
        <PlaylistActions
          isSubscribed={!!playlist.subscribed}
          hasFailed={hasFailed}
          isRetrying={retryFailedTracks.isPending}
          onToggleSubscription={handleToggleActive}
          onRetryFailed={handleRetryFailed}
          onDelete={handleDelete}
        />
      }
    >
      {tracks.length > 0 && (
        <div className="space-y-1">
          {tracks.map((track, index) => (
            <TrackListItem
              key={track.id}
              index={index}
              name={track.name}
              trackUrl={track.trackUrl}
              artists={track.artists || track.artist}
              actions={
                <>
                  <TrackStatusBadge status={track.status} />
                  <TrackActions
                    trackId={track.id}
                    status={track.status}
                    onRetry={handleRetryTrack}
                    onDelete={handleDeleteTrack}
                  />
                </>
              }
            />
          ))}
        </div>
      )}
    </PlaylistLayout>
  );
};
