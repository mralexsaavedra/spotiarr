import { PlaylistPreview, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useBulkTrackStatus } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { playlistService } from "@/services/playlist.service";
import { PlaylistWithStats } from "@/types";
import { Track } from "@/types";
import { usePlaylistPreviewQuery } from "../queries/usePlaylistPreviewQuery";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { usePlaylistController } from "./usePlaylistController";

const PLAYLIST_PREVIEW_PAGE_SIZE = 100;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spotifyUrl = searchParams.get("url");

  const { data: previewData, isLoading, error } = usePlaylistPreviewQuery(spotifyUrl);
  const { data: playlists } = usePlaylistsQuery();
  const [pagedTracks, setPagedTracks] = useState<PlaylistPreviewTrack[]>([]);
  const [hasMoreTracks, setHasMoreTracks] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoadingMoreTracks, setIsLoadingMoreTracks] = useState(false);
  const requestedOffsetsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    requestedOffsetsRef.current = new Set();

    if (!previewData || !spotifyUrl) {
      setPagedTracks([]);
      setHasMoreTracks(false);
      setNextOffset(null);
      return;
    }

    const initialTrackCount = previewData.tracks.length;
    const isPlaylistPreview = previewData.type === PlaylistTypeEnum.Playlist;
    const shouldLoadMore =
      isPlaylistPreview &&
      (previewData.totalTracks > initialTrackCount ||
        initialTrackCount >= PLAYLIST_PREVIEW_PAGE_SIZE);

    setPagedTracks([]);
    setHasMoreTracks(shouldLoadMore);
    setNextOffset(shouldLoadMore ? initialTrackCount : null);
  }, [previewData, spotifyUrl]);

  const accumulatedPreviewTracks = useMemo(() => {
    if (!previewData) {
      return [];
    }

    return mergeUniquePreviewTracks([...previewData.tracks, ...pagedTracks]);
  }, [previewData, pagedTracks]);

  const handleLoadMoreTracks = useCallback(async () => {
    if (!spotifyUrl || !hasMoreTracks || nextOffset === null || isLoadingMoreTracks) {
      return;
    }

    if (requestedOffsetsRef.current.has(nextOffset)) {
      return;
    }

    requestedOffsetsRef.current.add(nextOffset);
    setIsLoadingMoreTracks(true);

    try {
      const page = await playlistService.getPlaylistPreviewTracksPage(
        spotifyUrl,
        nextOffset,
        PLAYLIST_PREVIEW_PAGE_SIZE,
      );

      setPagedTracks((previous) => mergeUniquePreviewTracks([...previous, ...page.tracks]));
      setHasMoreTracks(page.hasMore);
      setNextOffset(page.nextOffset);
    } catch {
      requestedOffsetsRef.current.delete(nextOffset);
    } finally {
      setIsLoadingMoreTracks(false);
    }
  }, [hasMoreTracks, isLoadingMoreTracks, nextOffset, spotifyUrl]);

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
      stats: {
        completedCount: 0,
        downloadingCount: 0,
        searchingCount: 0,
        queuedCount: 0,
        activeCount: 0,
        errorCount: 0,
        totalCount: accumulatedPreviewTracks.length,
        progress: 0,
        isDownloading: false,
        hasErrors: false,
        isCompleted: false,
      },
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
    hasMoreTracks,
    isLoadingMoreTracks,
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
