import { ArtistRelease } from "@spotiarr/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DiscographyFilter } from "@/components/molecules/ArtistDiscographyFilters";
import { APP_CONFIG } from "@/config/app";
import { useAlbumTracksQuery } from "../queries/useAlbumTracksQuery";
import { useArtistAlbumsQuery } from "../queries/useArtistAlbumsQuery";

interface UseArtistDiscographyProps {
  artistId: string;
  initialAlbums: ArtistRelease[];
  pageSize?: number;
  hasMore?: boolean;
}

export const useArtistDiscographyController = ({
  artistId,
  initialAlbums,
  pageSize = APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
  hasMore = true,
}: UseArtistDiscographyProps) => {
  const [filter, setFilter] = useState<DiscographyFilter>("all");
  const [visibleItems, setVisibleItems] = useState(pageSize);
  const [allAlbums, setAllAlbums] = useState<ArtistRelease[]>(initialAlbums);
  const [offset, setOffset] = useState(initialAlbums.length);
  const [hasFetchedAll, setHasFetchedAll] = useState(!hasMore || initialAlbums.length < pageSize);
  const [expandedAlbum, setExpandedAlbum] = useState<ArtistRelease | null>(null);
  const shouldFetchMoreRef = useRef(false);

  const { data: moreAlbums, isFetching: isLoadingMore } = useArtistAlbumsQuery({
    artistId,
    limit: pageSize,
    offset,
    enabled:
      shouldFetchMoreRef.current && offset > initialAlbums.length && !hasFetchedAll && hasMore,
  });

  const { data: albumTracks = [], isFetching: isLoadingTracks } = useAlbumTracksQuery({
    artistId,
    albumId: expandedAlbum?.albumId ?? "",
    enabled: !!expandedAlbum,
  });

  useEffect(() => {
    shouldFetchMoreRef.current = false;
    setAllAlbums(initialAlbums);
    setOffset(initialAlbums.length);
    setHasFetchedAll(!hasMore || initialAlbums.length < pageSize);
  }, [initialAlbums, hasMore, pageSize]);

  useEffect(() => {
    setVisibleItems(pageSize);
  }, [filter, pageSize]);

  useEffect(() => {
    if (!moreAlbums || !shouldFetchMoreRef.current) {
      return;
    }

    if (moreAlbums.length < pageSize) {
      setHasFetchedAll(true);
    }

    if (moreAlbums.length === 0) {
      shouldFetchMoreRef.current = false;
      return;
    }

    const existingIds = new Set(allAlbums.map((a) => a.albumId));
    const uniqueNewAlbums = moreAlbums.filter((a) => !existingIds.has(a.albumId));

    if (uniqueNewAlbums.length === 0) {
      setHasFetchedAll(true);
      shouldFetchMoreRef.current = false;
      return;
    }

    setAllAlbums((prev) => [...prev, ...uniqueNewAlbums]);

    shouldFetchMoreRef.current = false;
  }, [allAlbums, moreAlbums, pageSize, hasMore]);

  const filteredAlbums = useMemo(() => {
    let result = allAlbums;

    if (filter !== "all") {
      result = result.filter((a) => a.albumType === filter);
    }

    return [...result].sort((a, b) => {
      const dateA = a.releaseDate || "";
      const dateB = b.releaseDate || "";
      return dateB.localeCompare(dateA);
    });
  }, [allAlbums, filter]);

  const handleShowMore = useCallback(() => {
    setVisibleItems((prev) => prev + pageSize);

    if (!hasFetchedAll && hasMore && visibleItems + pageSize >= allAlbums.length) {
      shouldFetchMoreRef.current = true;
      setOffset((prev) => prev + pageSize);
    }
  }, [pageSize, hasFetchedAll, hasMore, visibleItems, allAlbums.length]);

  const handleEndReached = useCallback(() => {
    if (hasFetchedAll || !hasMore || shouldFetchMoreRef.current) {
      return;
    }

    shouldFetchMoreRef.current = true;
    setOffset((prev) => prev + pageSize);
  }, [hasFetchedAll, hasMore, pageSize]);

  const handleAlbumExpand = useCallback((album: ArtistRelease) => {
    setExpandedAlbum(album);
  }, []);

  const handleAlbumExpandClose = useCallback(() => {
    setExpandedAlbum(null);
  }, []);

  const canShowMore =
    visibleItems < filteredAlbums.length ||
    (!hasFetchedAll && filteredAlbums.length >= pageSize && hasMore);

  return {
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    handleEndReached,
    handleAlbumExpand,
    handleAlbumExpandClose,
    canShowMore,
    expandedAlbum,
    albumTracks,
    isLoadingTracks,
  };
};
