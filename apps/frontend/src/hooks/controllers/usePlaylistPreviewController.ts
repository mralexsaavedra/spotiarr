import { PlaylistPreview, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useBulkTrackStatus } from "@/hooks/queries/useDownloadStatus";
import { PlaylistWithStats } from "@/types";
import { Track } from "@/types";
import { buildZeroStats } from "@/utils/playlist";
import { usePlaylistPreviewQuery } from "../queries/usePlaylistPreviewQuery";
import {
  PLAYLIST_PREVIEW_PAGE_SIZE,
  usePlaylistPreviewTracksInfiniteQuery,
} from "../queries/usePlaylistPreviewTracksInfiniteQuery";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useNavigationHelpers } from "../useNavigationHelpers";
import { usePlaylistController } from "./usePlaylistController";

type PlaylistPreviewTrack = PlaylistPreview["tracks"][number];

const createPreviewTrackKey = (track: PlaylistPreviewTrack): string => {
  if (track.trackUrl) {
    return track.trackUrl;
  }

  const artists = track.artists.map((artist) => artist.name).join("|");
  return `${track.name}::${artists}::${track.album}`;
};

const mergeUniquePreviewTracks = (tracks: PlaylistPreviewTrack[]): PlaylistPreviewTrack[] => {
  const uniqueTracks = new Map<string, PlaylistPreviewTrack>();

  for (const track of tracks) {
    uniqueTracks.set(createPreviewTrackKey(track), track);
  }

  return Array.from(uniqueTracks.values());
};

export const usePlaylistPreviewController = () => {
  const { handleGoBack, handleGoHome } = useNavigationHelpers();
  const [searchParams] = useSearchParams();
  const spotifyUrl = searchParams.get("url");

  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);
  const { data: playlists } = usePlaylistsQuery();

  const [paginationStarted, setPaginationStarted] = useState(false);

  useEffect(() => {
    setPaginationStarted(false);
  }, [spotifyUrl]);

  const initialTrackCount = previewData?.tracks.length ?? 0;
  const isPlaylistPreview = previewData?.type === PlaylistTypeEnum.Playlist;
  const shouldLoadMore =
    isPlaylistPreview &&
    previewData != null &&
    (previewData.totalTracks > initialTrackCount ||
      initialTrackCount >= PLAYLIST_PREVIEW_PAGE_SIZE);

  const queryEnabled = !!spotifyUrl && previewData != null && shouldLoadMore && paginationStarted;

  const {
    data: infiniteData,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isInfiniteFetching,
    fetchNextPage,
  } = usePlaylistPreviewTracksInfiniteQuery(spotifyUrl, initialTrackCount, queryEnabled);

  const infinitePages = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.tracks) ?? [],
    [infiniteData],
  );

  const accumulatedPreviewTracks = useMemo(() => {
    if (!previewData) {
      return [];
    }

    return mergeUniquePreviewTracks([...previewData.tracks, ...infinitePages]);
  }, [previewData, infinitePages]);

  const handleLoadMoreTracks = useCallback(() => {
    if (!shouldLoadMore) return;
    if (!paginationStarted) {
      setPaginationStarted(true);
      return;
    }
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [shouldLoadMore, paginationStarted, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const savedPlaylist = useMemo(() => {
    return playlists?.find((p) => p.spotifyUrl === spotifyUrl);
  }, [playlists, spotifyUrl]);

  const savedPlaylistId = savedPlaylist?.id;

  const trackUrls = useMemo(
    () => accumulatedPreviewTracks.map((t) => t.trackUrl),
    [accumulatedPreviewTracks],
  );

  const trackStatusesMap = useBulkTrackStatus(trackUrls);

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
      stats: buildZeroStats(accumulatedPreviewTracks.length),
    };
  }, [accumulatedPreviewTracks.length, previewData, spotifyUrl, savedPlaylist?.subscribed]);

  const tracks: Track[] = useMemo(() => {
    if (!accumulatedPreviewTracks.length) return [];

    return accumulatedPreviewTracks.map((t, i) => {
      const status = t.trackUrl ? trackStatusesMap.get(t.trackUrl) : undefined;

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
  }, [accumulatedPreviewTracks, trackStatusesMap]);

  const {
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
  } = usePlaylistController({
    playlist,
    tracks,
    spotifyUrl,
    id: savedPlaylistId,
    expectedTrackCount: previewData?.totalTracks,
  });

  const isSaved = !!savedPlaylistId || tracks.some((t) => t.status === TrackStatusEnum.Completed);
  const totalCount = previewData?.totalTracks ?? accumulatedPreviewTracks.length;

  return {
    playlist,
    tracks,
    totalCount,
    isLoading,
    error,
    isButtonLoading,
    hasMoreTracks: shouldLoadMore && (!paginationStarted || hasNextPage),
    isLoadingMoreTracks:
      isFetchingNextPage || (paginationStarted && isInfiniteFetching && !infiniteData),
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
    handleLoadMoreTracks,
    handleGoBack,
    handleGoHome,
  };
};
