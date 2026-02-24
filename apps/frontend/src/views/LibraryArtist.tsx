import { faMusic } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ApiRoutes, LibraryAlbum } from "@spotiarr/shared";
import { FC } from "react";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { LibraryAlbumCard } from "@/components/molecules/LibraryAlbumCard";
import { useLibraryArtistController } from "@/hooks/controllers/useLibraryArtistController";

export const LibraryArtist: FC = () => {
  const { t, artist, isLoading, error } = useLibraryArtistController();

  if (isLoading) {
    return <Loading />;
  }

  if (error || !artist) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <EmptyState
          icon={faMusic}
          title={t("library.artistNotFound", "Artist not found")}
          description={t("library.artistNotFoundDescription", "Could not load artist details.")}
        />
      </div>
    );
  }

  const imageUrl = artist.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(artist.image)}`
    : null;

  return (
    <section className="bg-background flex-1 px-4 py-6 md:px-8">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex flex-col items-center gap-6 pb-8 md:flex-row md:items-start">
          <div className="h-48 w-48 flex-shrink-0 overflow-hidden rounded-full shadow-lg md:h-64 md:w-64">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={artist.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="bg-brand-primary/10 text-brand-primary flex h-full w-full items-center justify-center text-6xl">
                <FontAwesomeIcon icon={faMusic} />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col items-center text-center md:items-start md:text-left">
            <h1 className="text-text-primary text-4xl font-bold md:text-5xl lg:text-6xl">
              {artist.name}
            </h1>
            <div className="text-text-secondary mt-2 flex items-center gap-2 text-sm tracking-wider uppercase">
              <span>
                {artist.albumCount}{" "}
                {artist.albumCount === 1
                  ? t("common.album", "Album")
                  : t("common.albums", "Albums")}
              </span>
              <span>•</span>
              <span>
                {artist.trackCount}{" "}
                {artist.trackCount === 1
                  ? t("common.track", "Track")
                  : t("common.tracks", "Tracks")}
              </span>
            </div>
          </div>
        </div>

        {/* Albums */}
        <div className="border-t border-white/10 pt-8">
          <h2 className="text-text-primary mb-6 text-2xl font-bold">
            {t("common.albums", "Albums")}
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {artist.albums.map((album: LibraryAlbum) => (
              <LibraryAlbumCard key={album.path} album={album} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
