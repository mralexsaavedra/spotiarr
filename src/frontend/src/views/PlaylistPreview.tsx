import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PreviewError } from "../components/molecules/PreviewError";
import { Playlist } from "../components/organisms/Playlist";
import { PlaylistSkeleton } from "../components/skeletons/PlaylistSkeleton";
import { useDownloadStatusContext } from "../contexts/DownloadStatusContext";
import { usePlaylistController } from "../hooks/controllers/usePlaylistController";
import { usePlaylistPreviewQuery } from "../hooks/queries/usePlaylistPreviewQuery";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { Path } from "../routes/routes";
import { PlaylistWithStats } from "../types/playlist";
import { Track } from "../types/track";

export const PlaylistPreview: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spotifyUrl = searchParams.get("url");

  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);
  const { data: playlists } = usePlaylistsQuery();
  const { getTrackStatus } = useDownloadStatusContext();

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

  const {
    isDownloading,
    isDownloaded,
    hasFailed,
    handleDownload,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    mutations: { createPlaylist },
  } = usePlaylistController({
    playlist,
    tracks,
    spotifyUrl,
    id: savedPlaylistId,
  });

  const isButtonLoading =
    createPlaylist.isPending ||
    isDownloading ||
    (createPlaylist.isSuccess && !isDownloading && !isDownloaded);

  const isSaved = !!savedPlaylistId || tracks.some((t) => t.status === TrackStatusEnum.Completed);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

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
      onDownloadTrack={handleRetryTrack}
      onDownload={handleDownload}
      onRetryTrack={(trackId) => {
        const track = tracks.find((t) => t.id === trackId);
        if (track) handleRetryTrack(track);
      }}
      onConfirmDelete={handleDelete}
      onRetryFailed={handleRetryFailed}
      onToggleSubscription={handleToggleSubscription}
    />
  );
};
