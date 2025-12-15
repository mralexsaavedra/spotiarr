import { faCheck, faDownload, faMusic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/atoms/Button";
import { Loading } from "@/components/atoms/Loading";
import { ArtistHeader } from "@/components/molecules/ArtistHeader";
import { EmptyState } from "@/components/molecules/EmptyState";
import { SpotifyErrorState } from "@/components/molecules/SpotifyErrorState";
import { SpotifyLinkButton } from "@/components/molecules/SpotifyLinkButton";
import { ArtistDiscography } from "@/components/organisms/ArtistDiscography";
import { TrackList } from "@/components/organisms/TrackList";
import { useArtistDetailController } from "@/hooks/controllers/useArtistDetailController";

export const ArtistDetail: FC = () => {
  const { t } = useTranslation();
  const {
    id,
    artist,
    isLoading,
    error,
    hasArtist,
    isArtistDownloaded,
    followersText,
    tracks,
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
    handleArtistDownload,
    handleTrackDownload,
    handleDownload,
    handleNavigate,
    handleArtistClick,
  } = useArtistDetailController();

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <SpotifyErrorState error={error} message={t("artist.error")} />
      </div>
    );
  }

  if (!hasArtist) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center text-white">
        <p className="text-text-secondary">{t("artist.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-black text-white">
      <ArtistHeader
        name={artist?.name || "Artist"}
        image={artist?.image}
        followersText={followersText}
        spotifyUrl={artist?.spotifyUrl}
      />

      {/* Content */}
      <div className="from-background flex-1 bg-gradient-to-b to-black px-6 pb-10 md:px-8">
        {/* Action Buttons */}
        <div className="flex items-center gap-3 py-6 md:gap-4">
          {/* Download Button (Circular) */}
          <Button
            variant="primary"
            size="lg"
            className={`!h-12 !w-12 justify-center !rounded-full !p-0 shadow-lg transition-transform md:!h-14 md:!w-14 ${
              isArtistDownloaded ? "bg-green-500 hover:bg-green-600" : "hover:scale-105"
            }`}
            onClick={handleArtistDownload}
            disabled={!artist?.spotifyUrl || isArtistDownloaded}
            title={isArtistDownloaded ? t("artist.downloaded") : t("common.downloadAll")}
          >
            {isArtistDownloaded ? (
              <FontAwesomeIcon icon={faCheck} className="text-xl" />
            ) : (
              <FontAwesomeIcon icon={faDownload} className="text-xl" />
            )}
          </Button>

          {artist?.spotifyUrl && <SpotifyLinkButton url={artist.spotifyUrl} />}
        </div>

        {/* Popular Tracks Section */}
        <div className="mt-4">
          <h2 className="mb-4 text-2xl font-bold">{t("common.popular")}</h2>

          {!tracks || tracks.length === 0 ? (
            <EmptyState
              icon={faMusic}
              title={t("artist.emptyTracksTitle")}
              description={t("artist.emptyTracksDescription")}
              className="py-8"
            />
          ) : (
            <TrackList tracks={tracks} onDownload={handleTrackDownload} />
          )}
        </div>

        {/* Discography Section */}
        {artist?.albums && artist.albums.length > 0 ? (
          <ArtistDiscography
            artistId={id!}
            albums={artist.albums}
            filter={filter}
            onFilterChange={setFilter}
            filteredAlbums={filteredAlbums}
            visibleItems={visibleItems}
            isLoadingMore={isLoadingMore}
            onShowMore={handleShowMore}
            canShowMore={canShowMore}
            onDownload={handleDownload}
            onDiscographyItemClick={handleNavigate}
            onArtistClick={handleArtistClick}
          />
        ) : (
          <div className="text-text-secondary mt-10 text-center">
            <p>{t("artist.noDiscography")}</p>
          </div>
        )}
      </div>
    </div>
  );
};
