import { LibraryArtist } from "@spotiarr/shared";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Path } from "@/routes/routes";
import { useScanLibraryMutation } from "../mutations/useScanLibraryMutation";
import { useLibraryArtistsQuery } from "../queries/useLibraryArtistsQuery";
import { useLibraryStatsQuery } from "../queries/useLibraryStatsQuery";

export const useHomeController = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: stats, isLoading: isStatsLoading } = useLibraryStatsQuery();
  const { data: artists, isLoading: isArtistsLoading } = useLibraryArtistsQuery();
  const { mutate: scanLibrary, isPending: isScanning } = useScanLibraryMutation();

  const isLoading = isStatsLoading || isArtistsLoading;

  const handleScan = useCallback(() => {
    scanLibrary();
  }, [scanLibrary]);

  const handleArtistClick = useCallback(
    (artist: LibraryArtist) => {
      if (artist.name) {
        navigate(Path.LIBRARY_ARTIST.replace(":name", encodeURIComponent(artist.name)));
      }
    },
    [navigate],
  );

  const formatSize = useCallback((bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
  }, []);

  const statsData = useMemo(() => {
    if (!stats) return null;
    return {
      artists: stats.totalArtists,
      albums: stats.totalAlbums,
      tracks: stats.totalTracks,
      size: formatSize(stats.totalSize),
    };
  }, [stats, formatSize]);

  // Sort artists alphabetically if not already
  const sortedArtists = useMemo(() => {
    if (!artists) return [];
    return [...artists].sort((a, b) => a.name.localeCompare(b.name));
  }, [artists]);

  return {
    t,
    stats: statsData,
    artists: sortedArtists,
    isLoading,
    isScanning,
    handleScan,
    handleArtistClick,
    formatSize,
  };
};
