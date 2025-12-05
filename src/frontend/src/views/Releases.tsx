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
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <SpotifyErrorState error={error} message="Failed to load releases." />
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="max-w-full">
        <PageHeader title="Releases" className="mb-6" />

        {isLoading ? (
          <Loading />
        ) : !releases || releases.length === 0 ? (
          <EmptyState
            icon="compact-disc"
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
