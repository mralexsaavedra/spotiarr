import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { generatePath, useNavigate, useParams } from "react-router-dom";
import { useLibraryArtistQuery } from "@/hooks/queries/useLibraryArtistQuery";
import { Path } from "@/routes/routes";

export const useLibraryArtistController = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: artist, isLoading, error } = useLibraryArtistQuery(name || "");

  const [albumSearch, setAlbumSearch] = useState("");

  const onAlbumSearchChange = useCallback((value: string) => {
    setAlbumSearch(value);
  }, []);

  const artistWithSortedAlbums = useMemo(() => {
    if (!artist) return undefined;

    const term = albumSearch.trim().toLowerCase();

    const filtered = term
      ? artist.albums.filter((a) => a.name.toLowerCase().includes(term))
      : artist.albums;

    const sorted = [...filtered].sort((a, b) => {
      if (a.year && b.year) {
        return b.year - a.year;
      }
      return a.name.localeCompare(b.name);
    });

    return { ...artist, albums: sorted };
  }, [artist, albumSearch]);

  const noAlbumResults =
    albumSearch.trim().length > 0 &&
    (artist?.albums.length ?? 0) > 0 &&
    (artistWithSortedAlbums?.albums.length ?? 0) === 0;

  const handleAlbumClick = useCallback(
    (albumName: string) => {
      if (!name) {
        return;
      }

      navigate(
        generatePath(Path.LIBRARY_ALBUM, {
          name,
          albumName,
        }),
      );
    },
    [name, navigate],
  );

  return {
    t,
    artist: artistWithSortedAlbums,
    isLoading,
    error,
    handleAlbumClick,
    albumSearch,
    onAlbumSearchChange,
    noAlbumResults,
  };
};
