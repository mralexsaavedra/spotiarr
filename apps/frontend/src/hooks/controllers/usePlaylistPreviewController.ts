import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { PlaylistWithStats } from "@/types";
import { Track } from "@/types";
import { usePlaylistPreviewQuery } from "../queries/usePlaylistPreviewQuery";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { usePlaylistController } from "./usePlaylistController";

export const usePlaylistPreviewController = () => {
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
      owner: previewData.owner,
      ownerUrl: previewData.ownerUrl,
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
    completedCount,
    displayTitle,
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

  return {
    playlist,
    tracks,
    isLoading,
    error,
    isButtonLoading,
    isDownloaded,
    isSaved,
    hasFailed,
    completedCount,
    displayTitle,
    handleDownload,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    handleGoBack,
    handleGoHome,
  };
};
