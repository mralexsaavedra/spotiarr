import { faFolderOpen, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { Button } from "@/components/atoms/Button";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SearchInput } from "@/components/molecules/SearchInput";
import { StatCard } from "@/components/molecules/StatCard";
import { ArtworkBackfillStatusIndicator } from "@/components/organisms/ArtworkBackfillStatusIndicator";
import { HomePlaylistList } from "@/components/organisms/HomePlaylistList";
import { LibraryArtistList } from "@/components/organisms/LibraryArtistList";
import { ScanLibraryModal } from "@/components/organisms/ScanLibraryModal";
import { useHomeController } from "@/hooks/controllers/useHomeController";

export const Home: FC = () => {
  const {
    t,
    stats,
    isLoading,
    isScanning,
    isScanModalOpen,
    artworkBackfillStatus,
    handleOpenScanModal,
    handleCloseScanModal,
    handleConfirmScan,
    handleArtistClick,
    handlePlaylistClick,
    handleSearchChange,
    search,
    filteredPlaylists,
    filteredArtists,
  } = useHomeController();

  return (
    <section className="bg-background w-full px-4 py-6 md:px-8">
      <div className="max-w-full">
        <div className="bg-background/95 sticky top-[60px] z-30 -mx-4 mb-6 flex flex-col gap-3 border-b border-white/10 px-4 py-4 shadow-md backdrop-blur-md md:-mx-8 md:flex-row md:items-center md:justify-between md:px-8">
          <PageHeader
            title={t("library.title", "Library")}
            description={t("library.description", "Your downloaded music collection")}
          />
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder={t("library.searchPlaceholder", "Search playlists and artists...")}
              className="w-full md:w-64"
            />
            <Button
              variant="primary"
              size="md"
              icon={faRotate}
              onClick={handleOpenScanModal}
              disabled={isScanning}
              loading={isScanning}
            >
              {isScanning
                ? t("library.scanning", "Scanning...")
                : t("library.scan", "Scan Library")}
            </Button>
          </div>
        </div>

        <ArtworkBackfillStatusIndicator status={artworkBackfillStatus} />

        {stats && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label={t("library.artists", "Artists")} value={stats.artists} />
            <StatCard label={t("library.albums", "Albums")} value={stats.albums} />
            <StatCard label={t("library.tracks", "Tracks")} value={stats.tracks} />
            <StatCard label={t("library.size", "Total Size")} value={stats.size} />
          </div>
        )}

        {isLoading ? (
          <Loading />
        ) : (
          <>
            {filteredPlaylists.length > 0 && (
              <div className="mb-8">
                <h2 className="text-text-primary mb-4 text-lg font-semibold">
                  {t("library.playlistsSection", "Playlists")}
                </h2>
                <HomePlaylistList items={filteredPlaylists} onPlaylistClick={handlePlaylistClick} />
              </div>
            )}

            {filteredArtists.length === 0 && filteredPlaylists.length === 0 ? (
              <EmptyState
                icon={faFolderOpen}
                title={t("library.emptyTitle", "Library is empty")}
                description={t(
                  "library.emptyDescription",
                  "Scan your downloads folder to populate your library.",
                )}
                action={
                  <Button onClick={handleOpenScanModal} icon={faRotate} variant="primary">
                    {t("library.scanNow", "Scan Now")}
                  </Button>
                }
              />
            ) : filteredArtists.length > 0 ? (
              <LibraryArtistList artists={filteredArtists} onArtistClick={handleArtistClick} />
            ) : null}
          </>
        )}

        <ScanLibraryModal
          isOpen={isScanModalOpen}
          isSubmitting={isScanning}
          backfillStatus={artworkBackfillStatus?.status ?? "idle"}
          onCancel={handleCloseScanModal}
          onConfirm={handleConfirmScan}
        />
      </div>
    </section>
  );
};
