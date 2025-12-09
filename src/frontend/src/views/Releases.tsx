import { faCompactDisc } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { Loading } from "../components/atoms/Loading";
import { EmptyState } from "../components/molecules/EmptyState";
import { PageHeader } from "../components/molecules/PageHeader";
import { SpotifyErrorState } from "../components/molecules/SpotifyErrorState";
import { ReleasesList } from "../components/organisms/ReleasesList";
import { useReleasesController } from "../hooks/controllers/useReleasesController";

export const Releases: FC = () => {
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
      <section className="flex-1 px-4 py-6 bg-background md:px-8">
        <SpotifyErrorState error={error} message="Failed to load releases." />
      </section>
    );
  }

  return (
    <section className="flex-1 px-4 py-6 bg-background md:px-8">
      <div className="max-w-full">
        <PageHeader title="Releases" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : !releases || releases.length === 0 ? (
          <EmptyState
            icon={faCompactDisc}
            title="No new releases"
            description="No recent releases found from your followed artists."
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
