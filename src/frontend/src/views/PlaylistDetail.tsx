import { TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { Playlist } from "../components/organisms/Playlist";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { useDownloadStatusContext } from "../contexts/DownloadStatusContext";
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
  const { data: tracks = [], isLoading: isTracksLoading } = useTracksQuery(id);

  const updatePlaylist = useUpdatePlaylistMutation();
  const deletePlaylist = useDeletePlaylistMutation();
  const retryFailedTracks = useRetryFailedTracksMutation();
  const { mutate: retryTrack } = useRetryTrackMutation(id || "");

  const { isPlaylistDownloading } = useDownloadStatusContext();

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

  const hasFailed = useMemo(() => {
    return tracks.some((t) => t.status === TrackStatusEnum.Error);
  }, [tracks]);

  const isDownloading = isPlaylistDownloading(playlist?.spotifyUrl);

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  const handleToggleSubscription = useCallback(() => {
    if (!playlist) {
      return;
    }

    updatePlaylist.mutate({
      id: playlist.id,
      data: { subscribed: !playlist.subscribed },
    });
  }, [updatePlaylist, playlist]);

  const handleRetryFailed = useCallback(() => {
    if (!playlist || !hasFailed) {
      return;
    }

    retryFailedTracks.mutate(playlist.id);
  }, [hasFailed, retryFailedTracks, playlist]);

  const handleRetryTrack = useCallback(
    (trackId: string) => {
      retryTrack(trackId);
    },
    [retryTrack],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!playlist) {
      return;
    }

    deletePlaylist.mutate(playlist.id);
    navigate(Path.HOME);
  }, [deletePlaylist, playlist, navigate]);

  if (isPlaylistsLoading || isTracksLoading) {
    return <PlaylistSkeleton />;
  }

  if (!playlist) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <Playlist
      playlist={playlist}
      tracks={tracks}
      isDownloading={isDownloading}
      isDownloaded={playlist?.stats?.progress === 100}
      onRetryTrack={handleRetryTrack}
      onConfirmDelete={handleConfirmDelete}
      onRetryFailed={handleRetryFailed}
      hasFailed={hasFailed}
      isRetrying={retryFailedTracks.isPending}
      onToggleSubscription={handleToggleSubscription}
      onDownloadTrack={(track) => handleRetryTrack(track.id)}
      onDownload={handleRetryFailed}
    />
  );
};
