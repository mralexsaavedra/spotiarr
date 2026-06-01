import { ArtworkBackfillRunStatus, LibraryArtist } from "@spotiarr/shared";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/contexts/ToastContext";
import { Path } from "@/routes/routes";
import { ApiError } from "@/services/httpClient";
import { useScanLibraryMutation } from "../mutations/useScanLibraryMutation";
import { useStartArtworkBackfillMutation } from "../mutations/useStartArtworkBackfillMutation";
import { useArtworkBackfillStatusQuery } from "../queries/useArtworkBackfillStatusQuery";
import { useLibraryArtistsQuery } from "../queries/useLibraryArtistsQuery";
import { useLibraryStatsQuery } from "../queries/useLibraryStatsQuery";

const ACTIVE_BACKFILL_STATUSES = new Set<ArtworkBackfillRunStatus>([
  "running",
  "pause_requested",
  "paused",
  "paused_rate_limited",
]);

export const useHomeController = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isRetryBackfillOnly, setIsRetryBackfillOnly] = useState(false);
  const { data: stats, isLoading: isStatsLoading } = useLibraryStatsQuery();
  const { data: artists, isLoading: isArtistsLoading } = useLibraryArtistsQuery();
  const { data: artworkBackfillStatus } = useArtworkBackfillStatusQuery();
  const { mutateAsync: scanLibrary, isPending: isScanning } = useScanLibraryMutation();
  const { mutateAsync: startArtworkBackfill, isPending: isStartingArtworkBackfill } =
    useStartArtworkBackfillMutation();

  const isLoading = isStatsLoading || isArtistsLoading;

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
    isScanModalOpen,
    isLoading,
    isScanning: isScanning || isStartingArtworkBackfill,
    artworkBackfillStatus,
    isArtworkBackfillActive: ACTIVE_BACKFILL_STATUSES.has(artworkBackfillStatus?.status ?? "idle"),
    handleOpenScanModal,
    handleCloseScanModal,
    handleConfirmScan,
    handleArtistClick,
    formatSize,
  };
};
