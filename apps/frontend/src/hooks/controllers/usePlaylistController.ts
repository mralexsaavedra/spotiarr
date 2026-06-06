import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePlaylistDownloaded, usePlaylistDownloading } from "@/contexts/DownloadStatusContext";
import { Playlist, PlaylistWithStats } from "@/types";
import { Track } from "@/types";
import { formatPlaylistTitle } from "@/utils/playlist";
import { isSpotifyPlaylistUrl, isSpotifyUrl } from "@/utils/spotify";
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
  expectedTrackCount?: number;
}

export const usePlaylistController = ({
  playlist,
  tracks,
  spotifyUrl,
  id,
  expectedTrackCount,
}: UsePlaylistControllerProps) => {
  const navigate = useNavigate();

  const createPlaylist = useCreatePlaylistMutation();
  const updatePlaylist = useUpdatePlaylistMutation();
  const deletePlaylist = useDeletePlaylistMutation();
  const retryFailedTracks = useRetryFailedTracksMutation();
  const { mutate: retryTrack } = useRetryTrackMutation(id || "");

  const isDownloading = usePlaylistDownloading(spotifyUrl);
  const resolvedTrackCount = expectedTrackCount ?? tracks.length;
  const isDownloadedFromStore = usePlaylistDownloaded(spotifyUrl, resolvedTrackCount);

  const completedTrackCount = useMemo(
    () => tracks.filter((t) => t.status === TrackStatusEnum.Completed).length,
    [tracks],
  );

  const isDownloaded =
    expectedTrackCount != null && expectedTrackCount > 0
      ? completedTrackCount >= expectedTrackCount
      : isDownloadedFromStore;

  const hasFailed = useMemo(() => {
    return tracks.some((t) => t.status === TrackStatusEnum.Error);
  }, [tracks]);

  const handleDownload = useCallback(() => {
    if (!isSpotifyUrl(spotifyUrl)) return;
    createPlaylist.mutate({ kind: "spotifyUrl", spotifyUrl: spotifyUrl! });
  }, [spotifyUrl, createPlaylist]);

  const handleToggleSubscription = useCallback(() => {
    if (id && playlist) {
      updatePlaylist.mutate({
        id,
        data: { subscribed: !playlist.subscribed },
      });
    } else if (isSpotifyUrl(spotifyUrl)) {
      createPlaylist.mutate(
        { kind: "spotifyUrl", spotifyUrl: spotifyUrl! },
        {
          onSuccess: (newPlaylist) => {
            updatePlaylist.mutate({
              id: newPlaylist.id,
              data: { subscribed: true },
            });
          },
        },
      );
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
      if (track.status === TrackStatusEnum.Error && isSpotifyUrl(track.trackUrl)) {
        if (isSpotifyPlaylistUrl(spotifyUrl)) {
          createPlaylist.mutate({
            kind: "playlistTrack",
            parentSpotifyUrl: spotifyUrl!,
            trackUrl: track.trackUrl!,
          });
        } else {
          createPlaylist.mutate({ kind: "spotifyUrl", spotifyUrl: track.trackUrl! });
        }
      }
    });
  }, [id, hasFailed, tracks, retryFailedTracks, createPlaylist, spotifyUrl]);

  const handleRetryTrack = useCallback(
    (track: Track) => {
      const isSynthetic =
        !track.id ||
        track.id.startsWith("preview-") ||
        track.id.startsWith("top-") ||
        track.id.startsWith("album-");

      if (!isSynthetic) {
        retryTrack(track.id);
        return;
      }

      // Synthetic ids have no DB row yet. Only Spotify trackUrls can be
      // resolved via createPlaylist; Deezer/MB urls have no single-track path.
      if (isSpotifyUrl(track.trackUrl)) {
        if (isSpotifyPlaylistUrl(spotifyUrl)) {
          createPlaylist.mutate({
            kind: "playlistTrack",
            parentSpotifyUrl: spotifyUrl!,
            trackUrl: track.trackUrl!,
          });
        } else {
          createPlaylist.mutate({ kind: "spotifyUrl", spotifyUrl: track.trackUrl! });
        }
      }
    },
    [retryTrack, createPlaylist, spotifyUrl],
  );

  const completedCount = useMemo(() => {
    return tracks.filter((t) => t.status === TrackStatusEnum.Completed).length;
  }, [tracks]);

  const displayTitle = useMemo(
    () =>
      formatPlaylistTitle(
        playlist?.name || "Unnamed Playlist",
        playlist?.type || PlaylistTypeEnum.Playlist,
        tracks,
      ),
    [playlist?.name, playlist?.type, tracks],
  );

  const isButtonLoading =
    createPlaylist.isPending ||
    isDownloading ||
    (createPlaylist.isSuccess && !isDownloading && !isDownloaded);

  return {
    isDownloading,
    isDownloaded,
    isButtonLoading,
    hasFailed,
    completedCount,
    displayTitle,
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
