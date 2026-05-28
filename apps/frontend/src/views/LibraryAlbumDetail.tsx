import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Loading } from "@/components/atoms/Loading";
import { AlbumPageLayout } from "@/components/molecules/AlbumPageLayout";
import { EmptyState } from "@/components/molecules/EmptyState";
import { useLibraryAlbumDetailController } from "@/hooks/controllers/useLibraryAlbumDetailController";

export const LibraryAlbumDetail: FC = () => {
  const { t } = useTranslation();
  const {
    artistName,
    album,
    tracks,
    coverUrl,
    isLoading,
    error,
    isNotFound,
    playlistType,
    backToArtistPath,
  } = useLibraryAlbumDetailController();

  if (isLoading) {
    return (
      <main className="bg-background flex flex-1 items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <Loading />
          <p className="text-text-secondary">{t("library.album.loading")}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <div className="space-y-4">
          <EmptyState icon={faMusic} title={t("library.album.error")} description={String(error)} />
          <div className="text-center">
            <Link
              to={backToArtistPath}
              className="text-primary hover:text-primary/80 focus-visible:ring-primary inline-flex rounded-md px-3 py-2 font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("library.album.backToArtist")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isNotFound || !album) {
    return (
      <main className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <div className="space-y-4">
          <EmptyState
            icon={faMusic}
            title={t("library.album.notFound")}
            description={t("library.album.notFoundDescription")}
          />
          <div className="text-center">
            <Link
              to={backToArtistPath}
              className="text-primary hover:text-primary/80 focus-visible:ring-primary inline-flex rounded-md px-3 py-2 font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("library.album.backToArtist")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <AlbumPageLayout
        title={album.name}
        type={playlistType}
        coverUrl={coverUrl}
        description={artistName}
        metadata={
          <span>
            {tracks.length} {t("library.album.tracks")}
          </span>
        }
        totalCount={tracks.length}
        tracks={tracks}
        emptyTitle={t("library.album.emptyTracks")}
        emptyDescription={t("library.album.emptyTracks")}
      />
    </main>
  );
};
