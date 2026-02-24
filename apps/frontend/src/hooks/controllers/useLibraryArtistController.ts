import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useLibraryArtistQuery } from "@/hooks/queries/useLibraryArtistQuery";

export const useLibraryArtistController = () => {
  const { name } = useParams<{ name: string }>();
  const { t } = useTranslation();

  const { data: artist, isLoading, error } = useLibraryArtistQuery(name || "");

  // Sort albums by year (descending) or name, and memoize the result
  const artistWithSortedAlbums = useMemo(() => {
    if (!artist) return undefined;

    const sortedAlbums = [...artist.albums].sort((a, b) => {
      if (a.year && b.year) {
        return b.year - a.year;
      }
      return a.name.localeCompare(b.name);
    });

    return { ...artist, albums: sortedAlbums };
  }, [artist]);

  return {
    t,
    artist: artistWithSortedAlbums,
    isLoading,
    error,
  };
};
