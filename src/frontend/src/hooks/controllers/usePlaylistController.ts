import { TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDownloadStatusContext } from "../../contexts/DownloadStatusContext";
import { Playlist, PlaylistWithStats } from "../../types/playlist";
import { Track } from "../../types/track";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";
import { useDeletePlaylistMutation } from "../mutations/useDeletePlaylistMutation";
import { useRetryFailedTracksMutation } from "../mutations/useRetryFailedTracksMutation";
import { useRetryTrackMutation } from "../mutations/useRetryTrackMutation";
import { useUpdatePlaylistMutation } from "../mutations/useUpdatePlaylistMutation";

interface UsePlaylistControllerProps {
  playlist?: Playlist | PlaylistWithStats;
  tracks: Track[];
  spotifyUrl?: string | null;
  id?: string;
}

export const usePlaylistController = ({
  playlist,
  tracks,
  spotifyUrl,
  id,
}: UsePlaylistControllerProps) => {
  const navigate = useNavigate();

  const createPlaylist = useCreatePlaylistMutation();
  const updatePlaylist = useUpdatePlaylistMutation();
  const deletePlaylist = useDeletePlaylistMutation();
  const retryFailedTracks = useRetryFailedTracksMutation();
  const { mutate: retryTrack } = useRetryTrackMutation(id || "");

  const { isPlaylistDownloading, isPlaylistDownloaded } = useDownloadStatusContext();

  const isDownloading = isPlaylistDownloading(spotifyUrl);
  const isDownloaded = isPlaylistDownloaded(spotifyUrl, tracks.length);

  const hasFailed = useMemo(() => {
    return tracks.some((t) => t.status === TrackStatusEnum.Error);
  }, [tracks]);

  const handleDownload = useCallback(() => {
    if (!spotifyUrl) return;
    createPlaylist.mutate(spotifyUrl);
  }, [spotifyUrl, createPlaylist]);

  const handleToggleSubscription = useCallback(() => {
    if (id && playlist) {
      updatePlaylist.mutate({
        id,
        data: { subscribed: !playlist.subscribed },
      });
    } else if (spotifyUrl) {
      createPlaylist.mutate(spotifyUrl, {
        onSuccess: (newPlaylist) => {
          updatePlaylist.mutate({
            id: newPlaylist.id,
            data: { subscribed: true },
          });
        },
      });
    }
  }, [playlist, id, spotifyUrl, updatePlaylist, createPlaylist]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    deletePlaylist.mutate(id);
    navigate(-1);
  }, [id, deletePlaylist, navigate]);

  const handleRetryFailed = useCallback(() => {
    if (id && hasFailed) {
      retryFailedTracks.mutate(id);
      return;
    }

    tracks.forEach((track) => {
      if (track.status === TrackStatusEnum.Error && track.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    });
  }, [id, hasFailed, tracks, retryFailedTracks, createPlaylist]);

  const handleRetryTrack = useCallback(
    (track: Track) => {
      if (track.id && !track.id.startsWith("preview-") && !track.id.startsWith("top-")) {
        retryTrack(track.id);
      } else if (track.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    },
    [retryTrack, createPlaylist],
  );

  return {
    isDownloading,
    isDownloaded,
    hasFailed,
    handleDownload,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    mutations: {
      createPlaylist,
      updatePlaylist,
      deletePlaylist,
      retryFailedTracks,
    },
  };
};
