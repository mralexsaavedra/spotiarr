import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PreviewError } from "../components/molecules/PreviewError";
import { Playlist } from "../components/organisms/Playlist";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { useUpdatePlaylistMutation } from "../hooks/mutations/useUpdatePlaylistMutation";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useDownloadStatus } from "../hooks/useDownloadStatus";
import { Path } from "../routes/routes";
import { PlaylistWithStats } from "../types/playlist";
import { Track } from "../types/track";

export const PlaylistPreview: FC = () => {
  const [searchParams] = useSearchParams();
  const spotifyUrl = searchParams.get("url");
  const navigate = useNavigate();

  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);

  const { data: playlists } = usePlaylistsQuery();
  const deletePlaylist = useDeletePlaylistMutation();
  const createPlaylist = useCreatePlaylistMutation();
  const updatePlaylist = useUpdatePlaylistMutation();
  const { isPlaylistDownloaded, isPlaylistDownloading, getTrackStatus } = useDownloadStatus();

  const savedPlaylist = useMemo(() => {
    return playlists?.find((p) => p.spotifyUrl === spotifyUrl);
  }, [playlists, spotifyUrl]);

  const savedPlaylistId = savedPlaylist?.id;

  const playlist: PlaylistWithStats | undefined = useMemo(() => {
    if (!previewData || !spotifyUrl) {
      return undefined;
    }

    return {
      id: "preview",
      name: previewData.name,
      description: previewData.description || undefined,
      coverUrl: previewData.coverUrl || undefined,
      type: (previewData.type as PlaylistTypeEnum) || PlaylistTypeEnum.Playlist,
      spotifyUrl: spotifyUrl,
      subscribed: savedPlaylist?.subscribed ?? false,
      createdAt: Date.now(),
      stats: {
        completedCount: 0,
        downloadingCount: 0,
        searchingCount: 0,
        queuedCount: 0,
        activeCount: 0,
        errorCount: 0,
        totalCount: previewData.tracks.length,
        progress: 0,
        isDownloading: false,
        hasErrors: false,
        isCompleted: false,
      },
    };
  }, [previewData, spotifyUrl, savedPlaylist?.subscribed]);

  const tracks: Track[] = useMemo(() => {
    if (!previewData?.tracks) return [];

    return previewData.tracks.map((t, i) => {
      const status = t.trackUrl ? getTrackStatus(t.trackUrl) : undefined;

      return {
        id: `preview-${i}`,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        artists: t.artists.map((a) => ({ name: a.name, url: a.url })),
        album: t.album,
        durationMs: t.duration,
        status: status || TrackStatusEnum.New,
        trackUrl: t.trackUrl,
        albumUrl: t.albumUrl,
        playlistId: "preview",
      };
    });
  }, [previewData, getTrackStatus]);

  const isDownloaded = isPlaylistDownloaded(spotifyUrl, tracks.length);
  const isDownloading = isPlaylistDownloading(spotifyUrl);

  const isButtonLoading =
    createPlaylist.isPending ||
    isDownloading ||
    (createPlaylist.isSuccess && !isDownloading && !isDownloaded);

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate(Path.RELEASES);
  }, [navigate]);

  const handleDownload = useCallback(() => {
    if (!spotifyUrl) {
      return;
    }

    createPlaylist.mutate(spotifyUrl);
  }, [spotifyUrl, createPlaylist]);

  const handleDownloadTrack = useCallback(
    (track: Track) => {
      if (track.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    },
    [createPlaylist],
  );

  const handleRetryTrack = useCallback(
    (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (track?.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    },
    [tracks, createPlaylist],
  );

  const handleRetryFailed = useCallback(() => {
    tracks.forEach((track) => {
      if (track.status === TrackStatusEnum.Error && track.trackUrl) {
        createPlaylist.mutate(track.trackUrl);
      }
    });
  }, [tracks, createPlaylist]);

  const handleToggleSubscription = useCallback(() => {
    if (savedPlaylistId && playlist) {
      updatePlaylist.mutate({
        id: savedPlaylistId,
        data: { subscribed: !playlist.subscribed },
      });
    }
  }, [savedPlaylistId, playlist, updatePlaylist]);

  const handleConfirmDelete = useCallback(() => {
    if (savedPlaylistId) {
      deletePlaylist.mutate(savedPlaylistId);
      navigate(Path.HOME);
    }
  }, [deletePlaylist, savedPlaylistId, navigate]);

  const hasDownloadedTracks = useMemo(() => {
    return tracks.some((t) => t.status === TrackStatusEnum.Completed);
  }, [tracks]);

  const hasFailed = useMemo(() => {
    return tracks.some((t) => t.status === TrackStatusEnum.Error);
  }, [tracks]);

  const isSaved = !!savedPlaylistId || hasDownloadedTracks;

  if (isLoading) {
    return <PlaylistSkeleton />;
  }

  if (error) {
    return <PreviewError error={error} onGoBack={handleGoBack} />;
  }

  if (!playlist) {
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <Playlist
      playlist={playlist}
      tracks={tracks}
      hasFailed={hasFailed}
      isRetrying={false}
      isDownloading={isButtonLoading}
      isDownloaded={isDownloaded}
      isSaved={isSaved}
      onDownloadTrack={handleDownloadTrack}
      onDownload={handleDownload}
      onRetryTrack={handleRetryTrack}
      onConfirmDelete={handleConfirmDelete}
      onRetryFailed={handleRetryFailed}
      onToggleSubscription={handleToggleSubscription}
    />
  );
};
