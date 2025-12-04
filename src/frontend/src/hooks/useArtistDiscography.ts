import { ArtistRelease } from "@spotiarr/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiscographyFilter } from "../components/molecules/ArtistDiscographyFilters";
import { APP_CONFIG } from "../config/app";
import { useArtistAlbumsQuery } from "./queries/useArtistAlbumsQuery";

interface UseArtistDiscographyProps {
  artistId: string;
  initialAlbums: ArtistRelease[];
  pageSize?: number;
}

export const useArtistDiscography = ({
  artistId,
  initialAlbums,
  pageSize = APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
}: UseArtistDiscographyProps) => {
  const [filter, setFilter] = useState<DiscographyFilter>("all");
  const [visibleItems, setVisibleItems] = useState(pageSize);
  const [allAlbums, setAllAlbums] = useState<ArtistRelease[]>(initialAlbums);
  const [offset, setOffset] = useState(initialAlbums.length);
  const [hasFetchedAll, setHasFetchedAll] = useState(false);

  const { data: moreAlbums, isFetching: isLoadingMore } = useArtistAlbumsQuery({
    artistId,
    limit: pageSize,
    offset,
    enabled: offset > initialAlbums.length && !hasFetchedAll,
  });

  useEffect(() => {
    setAllAlbums(initialAlbums);
    setOffset(initialAlbums.length);
  }, [initialAlbums]);

  useEffect(() => {
    setVisibleItems(pageSize);
  }, [filter, pageSize]);

  useEffect(() => {
    if (moreAlbums && moreAlbums.length > 0) {
      if (moreAlbums.length < pageSize) {
        setHasFetchedAll(true);
      }

      setAllAlbums((prev) => {
        const existingIds = new Set(prev.map((a) => a.albumId));
        const uniqueNewAlbums = moreAlbums.filter((a) => !existingIds.has(a.albumId));

        if (uniqueNewAlbums.length === 0) {
          return prev;
        }

        return [...prev, ...uniqueNewAlbums];
      });
    }
  }, [moreAlbums, pageSize]);

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

    if (!hasFetchedAll && visibleItems + pageSize >= allAlbums.length) {
      setOffset((prev) => prev + pageSize);
    }
  }, [pageSize, hasFetchedAll, visibleItems, allAlbums.length]);

  const canShowMore =
    visibleItems < filteredAlbums.length || (!hasFetchedAll && filteredAlbums.length >= pageSize);

  return {
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
  };
};
