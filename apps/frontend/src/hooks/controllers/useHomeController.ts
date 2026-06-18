import { LibraryArtist } from "@spotiarr/shared";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { APP_CONFIG } from "@/config/app";
import { useToast } from "@/contexts/ToastContext";
import { Path } from "@/routes/routes";
import { ApiError } from "@/services/httpClient";
import { ACTIVE_BACKFILL_STATUSES } from "@/utils/artworkBackfill";
import { selectLibraryPlaylists } from "@/utils/playlist";
import { useScanLibraryMutation } from "../mutations/useScanLibraryMutation";
import { useStartArtworkBackfillMutation } from "../mutations/useStartArtworkBackfillMutation";
import { useArtworkBackfillStatusQuery } from "../queries/useArtworkBackfillStatusQuery";
import { useLibraryArtistsQuery } from "../queries/useLibraryArtistsQuery";
import { usePlaylistsQuery } from "../queries/usePlaylistsQuery";
import { useDebounce } from "../useDebounce";

export const useHomeController = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isRetryBackfillOnly, setIsRetryBackfillOnly] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, APP_CONFIG.DEBOUNCE.SEARCH_DELAY);
  const { data: artists, isLoading: isArtistsLoading } = useLibraryArtistsQuery();
  const { data: artworkBackfillStatus } = useArtworkBackfillStatusQuery();
  const { data: playlists = [] } = usePlaylistsQuery();
  const { mutateAsync: scanLibrary, isPending: isScanning } = useScanLibraryMutation();
  const { mutateAsync: startArtworkBackfill, isPending: isStartingArtworkBackfill } =
    useStartArtworkBackfillMutation();

  const isLoading = isArtistsLoading;

  const handleOpenScanModal = useCallback(() => {
    setIsRetryBackfillOnly(false);
    setIsScanModalOpen(true);
  }, []);

  const handleCloseScanModal = useCallback(() => {
    setIsRetryBackfillOnly(false);
    setIsScanModalOpen(false);
  }, []);

  const handleBackfillStartError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.success(
          t(
            isRetryBackfillOnly
              ? "library.scanModal.retryBackfillAlreadyRunning"
              : "library.scanModal.backfillAlreadyRunning",
            isRetryBackfillOnly
              ? "Artwork backfill is already running."
              : "Library scan started. Artwork backfill is already running.",
          ),
        );
        setIsRetryBackfillOnly(false);
        setIsScanModalOpen(false);
        return;
      }

      setIsRetryBackfillOnly(true);
      toast.warning(
        t(
          "library.scanModal.partialFailure",
          "Library scan started, but artwork backfill could not be started.",
        ),
      );
    },
    [isRetryBackfillOnly, t, toast],
  );

  const handleConfirmScan = useCallback(
    async ({ shouldStartBackfill }: { shouldStartBackfill: boolean }) => {
      try {
        if (!isRetryBackfillOnly) {
          await scanLibrary();
        }

        if (!shouldStartBackfill) {
          setIsRetryBackfillOnly(false);
          toast.success(t("library.scanModal.scanStarted", "Library scan started."));
          setIsScanModalOpen(false);
          return;
        }

        try {
          await startArtworkBackfill();
          toast.success(
            t(
              isRetryBackfillOnly
                ? "library.scanModal.retryBackfillStarted"
                : "library.scanModal.scanAndBackfillStarted",
              isRetryBackfillOnly
                ? "Artwork backfill started."
                : "Library scan and artwork backfill started.",
            ),
          );
          setIsRetryBackfillOnly(false);
          setIsScanModalOpen(false);
        } catch (error) {
          handleBackfillStartError(error);
        }
      } catch {
        setIsRetryBackfillOnly(false);
        toast.error(t("library.scanModal.scanFailed", "Failed to start library scan."));
      }
    },
    [handleBackfillStartError, isRetryBackfillOnly, scanLibrary, startArtworkBackfill, t, toast],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleArtistClick = useCallback(
    (artist: LibraryArtist) => {
      if (artist.name) {
        navigate(Path.LIBRARY_ARTIST.replace(":name", encodeURIComponent(artist.name)));
      }
    },
    [navigate],
  );

  const handlePlaylistClick = useCallback(
    (id: string) => {
      navigate(`${Path.PLAYLIST_DETAIL.replace(":id", id)}?mode=library`);
    },
    [navigate],
  );

  // Sort artists alphabetically if not already
  const sortedArtists = useMemo(() => {
    if (!artists) return [];
    return [...artists].sort((a, b) => a.name.localeCompare(b.name));
  }, [artists]);

  // Downloaded Spotify playlists plus AI-generated playlists, enriched with counts
  const downloadedPlaylists = useMemo(() => selectLibraryPlaylists(playlists), [playlists]);

  // Filtered by debounced search
  const filteredPlaylists = useMemo(() => {
    if (!debouncedSearch) return downloadedPlaylists;
    const lower = debouncedSearch.toLowerCase();
    return downloadedPlaylists.filter((item) =>
      (item.playlist.name ?? "").toLowerCase().includes(lower),
    );
  }, [downloadedPlaylists, debouncedSearch]);

  const filteredArtists = useMemo(() => {
    if (!debouncedSearch) return sortedArtists;
    const lower = debouncedSearch.toLowerCase();
    return sortedArtists.filter((a) => a.name.toLowerCase().includes(lower));
  }, [sortedArtists, debouncedSearch]);

  return {
    t,
    artists: sortedArtists,
    isScanModalOpen,
    isLoading,
    isScanning: isScanning || isStartingArtworkBackfill,
    artworkBackfillStatus,
    isArtworkBackfillActive: ACTIVE_BACKFILL_STATUSES.has(artworkBackfillStatus?.status ?? "idle"),
    handleOpenScanModal,
    handleCloseScanModal,
    handleConfirmScan,
    handleArtistClick,
    handlePlaylistClick,
    handleSearchChange,
    search,
    downloadedPlaylists,
    filteredPlaylists,
    filteredArtists,
  };
};
