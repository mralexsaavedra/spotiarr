import { faCompactDisc } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Loading } from "../components/atoms/Loading";
import { EmptyState } from "../components/molecules/EmptyState";
import { PageHeader } from "../components/molecules/PageHeader";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { ReleasesList } from "../components/organisms/ReleasesList";
import { useReleasesController } from "../hooks/controllers/useReleasesController";

export const Releases: FC = () => {
  const { t } = useTranslation();
  const {
    releases,
    isLoading,
    error,
    handleReleaseClick,
    handleDownloadRelease,
    handleArtistClick,
  } = useReleasesController();

  if (error) {
    return (
      <section className="bg-background flex-1 px-4 py-6 md:px-8">
        <SpotifyErrorState error={error} message={t("releases.error")} />
      </section>
    );
  }

  return (
    <section className="bg-background flex-1 px-4 py-6 md:px-8">
      <div className="max-w-full">
        <PageHeader title={t("releases.title")} className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : !releases || releases.length === 0 ? (
          <EmptyState
            icon={faCompactDisc}
            title={t("releases.emptyTitle")}
            description={t("releases.emptyDescription")}
          />
        ) : (
          <ReleasesList
            releases={releases}
            onReleaseClick={handleReleaseClick}
            onDownloadRelease={handleDownloadRelease}
            onArtistClick={handleArtistClick}
          />
        )}
      </div>
    </section>
  );
};
