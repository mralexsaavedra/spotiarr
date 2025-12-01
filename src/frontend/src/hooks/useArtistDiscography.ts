import { ArtistRelease } from "@spotiarr/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiscographyFilter } from "../components/molecules/ArtistDiscographyFilters";
import { api } from "../services/api";

interface UseArtistDiscographyProps {
  artistId: string;
  initialAlbums: ArtistRelease[];
}

export const useArtistDiscography = ({ artistId, initialAlbums }: UseArtistDiscographyProps) => {
  const [filter, setFilter] = useState<DiscographyFilter>("all");
  const [visibleItems, setVisibleItems] = useState(12);
  const [allAlbums, setAllAlbums] = useState<ArtistRelease[]>(initialAlbums);
  const [hasFetchedAll, setHasFetchedAll] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setAllAlbums(initialAlbums);
  }, [initialAlbums]);

  useEffect(() => {
    setVisibleItems(12);
  }, [filter]);

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

  const handleShowMore = useCallback(async () => {
    if (!hasFetchedAll) {
      setIsLoadingMore(true);
      try {
        const limit = 12;
        const offset = allAlbums.length;
        const moreAlbums = await api.getArtistAlbums(artistId, limit, offset);

        if (moreAlbums.length < limit) {
          setHasFetchedAll(true);
        }

        const existingIds = new Set(allAlbums.map((a) => a.albumId));
        const uniqueNewAlbums = moreAlbums.filter((a) => !existingIds.has(a.albumId));

        setAllAlbums((prev) => [...prev, ...uniqueNewAlbums]);
      } catch (error) {
        console.error("Failed to fetch more albums", error);
      } finally {
        setIsLoadingMore(false);
      }
    }

    setVisibleItems((prev) => prev + 12);
  }, [artistId, hasFetchedAll, allAlbums]);

  const canShowMore =
    visibleItems < filteredAlbums.length || (!hasFetchedAll && filteredAlbums.length >= 12);

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
