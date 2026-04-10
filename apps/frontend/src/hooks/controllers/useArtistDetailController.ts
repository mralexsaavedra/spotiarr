import { ArtistRelease } from "@spotiarr/shared";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { Path } from "@/routes/routes";
import { useCreatePlaylistMutation } from "../mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../queries/useArtistDetailQuery";
import { useGridColumns } from "../useGridColumns";
import { useArtistDiscographyController } from "./useArtistDiscographyController";

const EMPTY_ALBUMS: ArtistRelease[] = [];
const DETAIL_PAGE_SIZE = 25;

export const useArtistDetailController = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const columns = useGridColumns();
  const pageSize = columns * 2;

  const { artist, isLoading, error } = useArtistDetailQuery(id || null, DETAIL_PAGE_SIZE);
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
    pageSize,
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
  };
};
