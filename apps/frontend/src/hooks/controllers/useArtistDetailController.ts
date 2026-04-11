import { ArtistRelease } from "@spotiarr/shared";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlaylistDownloaded } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../queries/useArtistDetailQuery";
import { useGridColumns } from "../useGridColumns";
import { useArtistDiscographyController } from "./useArtistDiscographyController";

const EMPTY_ALBUMS: ArtistRelease[] = [];
const DETAIL_PAGE_SIZE = 25;
const NON_FOLLOWED_INITIAL_LIMIT = 5;

export const useArtistDetailController = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const columns = useGridColumns();
  const pageSize = columns * 2;

  // Use isFollowed from API response to determine initial limit
  // Backend enforces album cap: non-followed artists get max 5 albums
  const { artist, isLoading, error } = useArtistDetailQuery(id || null, DETAIL_PAGE_SIZE);
  const createPlaylistMutation = useCreatePlaylistMutation();

  const isArtistDownloaded = usePlaylistDownloaded(artist?.spotifyUrl);
  const hasArtist = !!artist && !!id && !error;

  // Determine if we should show more options based on followed status
  // Non-followed artists are capped at 5 albums by the backend
  const isFollowed = artist?.isFollowed ?? false;
  const canShowMoreOptions =
    isFollowed && (artist?.albums.length ?? 0) >= NON_FOLLOWED_INITIAL_LIMIT;

  const {
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    handleAlbumExpand,
    handleAlbumExpandClose,
    canShowMore,
    expandedAlbum,
    albumTracks,
    isLoadingTracks,
  } = useArtistDiscographyController({
    artistId: id!,
    initialAlbums: artist?.albums || EMPTY_ALBUMS,
    pageSize,
    hasMore: canShowMoreOptions,
  });

  const handleDownload = useCallback(
    (url?: string) => {
      if (!url) {
        return;
      }

      createPlaylistMutation.mutate(url);
    },
    [createPlaylistMutation],
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
    isFollowed,
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
    handleArtistDownload,
    handleDownload,
    handleNavigate,
    handleArtistClick,
    handleAlbumExpand,
    handleAlbumExpandClose,
    expandedAlbum,
    albumTracks,
    isLoadingTracks,
  };
};
