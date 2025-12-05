import { ArtistRelease, TrackStatusEnum } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDownloadStatusContext } from "../../contexts/DownloadStatusContext";
import { Path } from "../../routes/routes";
import { Track } from "../../types";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../queries/useArtistDetailQuery";
import { useGridColumns } from "../useGridColumns";
import { useArtistDiscographyController } from "./useArtistDiscographyController";

const EMPTY_ALBUMS: ArtistRelease[] = [];

export const useArtistDetailController = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const columns = useGridColumns();
  const limit = columns * 2;

  const { artist, isLoading, error } = useArtistDetailQuery(id || null, limit);
  const createPlaylistMutation = useCreatePlaylistMutation();

  const { isPlaylistDownloaded } = useDownloadStatusContext();
  const isArtistDownloaded = isPlaylistDownloaded(artist?.spotifyUrl);
  const hasArtist = !!artist && !!id && !error;

  const {
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
  } = useArtistDiscographyController({
    artistId: id!,
    initialAlbums: artist?.albums || EMPTY_ALBUMS,
    pageSize: limit,
  });

  const followersText = useMemo(
    () =>
      artist?.followers && artist.followers > 0
        ? new Intl.NumberFormat("en-US").format(artist.followers)
        : null,
    [artist?.followers],
  );

  const tracks: Track[] = useMemo(() => {
    if (!artist?.topTracks) return [];

    return artist.topTracks.map((t, i) => ({
      id: `top-${i}`,
      name: t.name,
      artist: artist.name,
      artists: [{ name: artist.name, url: artist.spotifyUrl || "" }],
      album: "",
      durationMs: t.durationMs,
      status: TrackStatusEnum.New,
      trackUrl: t.trackUrl,
      albumUrl: t.albumCoverUrl,
    }));
  }, [artist]);

  const handleDownload = useCallback(
    (url?: string) => {
      if (!url) {
        return;
      }

      createPlaylistMutation.mutate(url);
    },
    [createPlaylistMutation],
  );

  const handleTrackDownload = useCallback(
    (track: Track) => {
      if (track.trackUrl) {
        handleDownload(track.trackUrl);
      }
    },
    [handleDownload],
  );

  const handleArtistDownload = useCallback(() => {
    handleDownload(artist?.spotifyUrl || undefined);
  }, [handleDownload, artist?.spotifyUrl]);

  const handleNavigate = useCallback(
    (url: string) => {
      navigate(`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(url)}`);
    },
    [navigate],
  );

  const handleArtistClick = useCallback(
    (artistId: string) => {
      if (artistId !== id) {
        navigate(Path.ARTIST_DETAIL.replace(":id", artistId));
      }
    },
    [navigate, id],
  );

  return {
    id,
    artist,
    isLoading,
    error,
    hasArtist,
    isArtistDownloaded,
    followersText,
    tracks,
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
    handleArtistDownload,
    handleTrackDownload,
    handleDownload,
    handleNavigate,
    handleArtistClick,
  };
};
