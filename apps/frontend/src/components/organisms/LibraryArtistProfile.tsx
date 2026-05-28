import { ApiRoutes, LibraryArtist } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { ArtistHeader } from "../molecules/ArtistHeader";
import { LibraryAlbumList } from "./LibraryAlbumList";

interface LibraryArtistProfileProps {
  artist: LibraryArtist;
  onAlbumClick: (albumName: string) => void;
}

export const LibraryArtistProfile: FC<LibraryArtistProfileProps> = ({ artist, onAlbumClick }) => {
  const { t } = useTranslation();

  const imageUrl = artist.image
    ? `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/image?path=${encodeURIComponent(artist.image)}`
    : undefined;

  const subtitle = (
    <div className="flex items-center gap-2">
      <span>
        {artist.albumCount}{" "}
        {artist.albumCount === 1 ? t("common.album", "Album") : t("common.albums", "Albums")}
      </span>
      <span className="text-white/50">•</span>
      <span>
        {artist.trackCount}{" "}
        {artist.trackCount === 1 ? t("common.track", "Track") : t("common.tracks", "Tracks")}
      </span>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col bg-black text-white">
      <ArtistHeader name={artist.name} image={imageUrl} subtitle={subtitle} />

      {/* Content */}
      <div className="from-background flex-1 bg-linear-to-b to-black px-6 pb-10 md:px-8">
        {/* Albums Section */}
        <div className="mt-8">
          <h2 className="mb-6 text-2xl font-bold">{t("common.albums", "Albums")}</h2>
          <LibraryAlbumList
            artistName={artist.name}
            albums={artist.albums}
            onAlbumClick={(album) => onAlbumClick(album.name)}
          />
        </div>
      </div>
    </div>
  );
};
