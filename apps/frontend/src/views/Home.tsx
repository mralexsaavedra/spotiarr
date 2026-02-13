import { faFolderOpen, faRotate } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { Button } from "@/components/atoms/Button";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { PageHeader } from "@/components/molecules/PageHeader";
import { StatCard } from "@/components/molecules/StatCard";
import { LibraryArtistList } from "@/components/organisms/LibraryArtistList";
import { useHomeController } from "@/hooks/controllers/useHomeController";

export const Home: FC = () => {
  const { t, stats, artists, isLoading, isScanning, handleScan, handleArtistClick } =
    useHomeController();

  return (
    <section className="bg-background w-full px-4 py-6 md:px-8">
      <div className="max-w-full">
        <PageHeader
          title={t("library.title", "Library")}
          description={t("library.description", "Your downloaded music collection")}
          className="mb-6"
          action={
            <Button
              variant="primary"
              size="md"
              icon={faRotate}
              onClick={handleScan}
              disabled={isScanning}
              loading={isScanning}
            >
              {isScanning
                ? t("library.scanning", "Scanning...")
                : t("library.scan", "Scan Library")}
            </Button>
          }
        />

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
        ) : !artists || artists.length === 0 ? (
          <EmptyState
            icon={faFolderOpen}
            title={t("library.emptyTitle", "Library is empty")}
            description={t(
              "library.emptyDescription",
              "Scan your downloads folder to populate your library.",
            )}
            action={
              <Button onClick={handleScan} icon={faRotate} variant="primary">
                {t("library.scanNow", "Scan Now")}
              </Button>
            }
          />
        ) : (
          <LibraryArtistList artists={artists} onArtistClick={handleArtistClick} />
        )}
      </div>
    </section>
  );
};
