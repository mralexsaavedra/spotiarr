import { NormalizedTrack, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBulkTrackStatus } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { PlaylistWithStats, Track } from "@/types";
import { useAlbumTracksQuery } from "../queries/useAlbumTracksQuery";
import { useArtistAlbumsQuery } from "../queries/useArtistAlbumsQuery";
import { usePlaylistController } from "./usePlaylistController";

const ARTIST_ALBUMS_LIMIT = 50;
const ARTIST_ALBUMS_OFFSET = 0;

export const useAlbumDetailController = () => {
  const { artistId = "", albumId = "" } = useParams<{ artistId: string; albumId: string }>();
  const navigate = useNavigate();

  // Fetch album tracks
  const {
    data: rawTracks,
    isLoading: isTracksLoading,
    error: tracksError,
  } = useAlbumTracksQuery({ artistId, albumId, enabled: !!artistId && !!albumId });

  // Fetch artist albums for header metadata (name, cover, artistName)
  const { data: artistAlbums } = useArtistAlbumsQuery({
    artistId,
    limit: ARTIST_ALBUMS_LIMIT,
    offset: ARTIST_ALBUMS_OFFSET,
    enabled: !!artistId,
  });

  const album = useMemo(
    () => artistAlbums?.find((a) => a.albumId === albumId),
    [artistAlbums, albumId],
  );

  const trackUrls = useMemo(
    () => rawTracks?.map((t: NormalizedTrack) => t.trackUrl ?? null) ?? [],
    [rawTracks],
  );

  const trackStatusesMap = useBulkTrackStatus(trackUrls);

  const tracks: Track[] = useMemo(() => {
    if (!rawTracks?.length) return [];

    return rawTracks.map((t: NormalizedTrack, i: number) => {
      const status = t.trackUrl ? trackStatusesMap.get(t.trackUrl) : undefined;

      return {
        id: `album-${albumId}-${i}`,
        name: t.name,
        artist: t.artists.map((a) => a.name).join(", "),
        artists: t.artists.map((a) => ({ name: a.name, url: a.url })),
        album: t.album,
        durationMs: t.durationMs,
        status: status ?? TrackStatusEnum.New,
        trackUrl: t.trackUrl ?? undefined,
        albumUrl: t.albumUrl ?? undefined,
        playlistId: albumId,
      };
    });
  }, [rawTracks, albumId, trackStatusesMap]);

  const playlist: PlaylistWithStats | undefined = useMemo(() => {
    const firstTrack = rawTracks?.[0];
    const hasAlbum = !!album;
    const hasTracks = !!firstTrack;

    if (!hasAlbum && !hasTracks) return undefined;

    const name = album?.albumName ?? firstTrack?.album ?? "";
    const coverUrl = album?.coverUrl ?? firstTrack?.albumCoverUrl ?? undefined;
    const spotifyUrl = album?.spotifyUrl ?? firstTrack?.albumUrl ?? undefined;
    const owner = album?.artistName ?? firstTrack?.primaryArtist ?? firstTrack?.artist ?? "";

    return {
      id: albumId,
      name,
      description: undefined,
      coverUrl,
      type: PlaylistTypeEnum.Album,
      spotifyUrl,
      subscribed: false,
      createdAt: Date.now(),
      owner,
      ownerUrl: undefined,
      stats: {
        completedCount: 0,
        downloadingCount: 0,
        searchingCount: 0,
        queuedCount: 0,
        activeCount: 0,
        errorCount: 0,
        totalCount: tracks.length,
        progress: 0,
        isDownloading: false,
        hasErrors: false,
        isCompleted: false,
      },
    };
  }, [album, albumId, rawTracks, tracks.length]);

  const trackingUrl = useMemo(() => {
    if (album?.spotifyUrl) return album.spotifyUrl;
    if (artistId && albumId) return `spotiarr://album/${artistId}/${albumId}`;
    return null;
  }, [album?.spotifyUrl, artistId, albumId]);

  const {
    isDownloading,
    isDownloaded,
    hasFailed,
    completedCount,
    displayTitle,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    mutations: { createPlaylist },
  } = usePlaylistController({
    playlist,
    tracks,
    spotifyUrl: trackingUrl,
    id: undefined,
  });

  const handleDownload = useCallback(() => {
    if (!artistId || !albumId) return;
    createPlaylist.mutate({ kind: "album", artistId, albumId });
  }, [artistId, albumId, createPlaylist]);

  const handleDownloadTrack = useCallback(
    (track: Track) => {
      const parts = track.id.split("-");
      const i = parseInt(parts[parts.length - 1]!, 10);
      if (isNaN(i) || i < 0) return;
      createPlaylist.mutate({ kind: "albumTrack", artistId, albumId, trackIndex: i });
    },
    [artistId, albumId, createPlaylist],
  );

  const isButtonLoading =
    createPlaylist.isPending ||
    isDownloading ||
    (createPlaylist.isSuccess && !isDownloading && !isDownloaded);

  const isSaved = tracks.some((t) => t.status === TrackStatusEnum.Completed);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  return {
    playlist,
    tracks,
    album,
    isLoading: isTracksLoading,
    error: tracksError,
    isButtonLoading,
    hasMoreTracks: false as const,
    isLoadingMoreTracks: false as const,
    isDownloaded,
    isSaved,
    hasFailed,
    completedCount,
    displayTitle,
    handleDownload,
    handleDownloadTrack,
    handleToggleSubscription,
    handleDelete,
    handleRetryFailed,
    handleRetryTrack,
    onLoadMoreTracks: undefined,
    handleGoBack,
    handleGoHome,
  };
};
