import { LibraryAlbum } from "@spotiarr/shared";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { LibraryAlbumGridCard } from "../molecules/LibraryAlbumGridCard";

interface LibraryAlbumListProps {
  artistName: string;
  albums: LibraryAlbum[];
  onAlbumClick: (album: LibraryAlbum) => void;
}

export const LibraryAlbumList: FC<LibraryAlbumListProps> = memo(
  ({ artistName, albums, onAlbumClick }) => {
    const { t } = useTranslation();

    if (!albums || albums.length === 0) {
      return (
        <div className="text-text-secondary mt-10 text-center">
          <p>{t("artist.noDiscography", "No albums found")}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {albums.map((album) => (
          <LibraryAlbumGridCard
            key={album.path}
            album={album}
            artistName={artistName}
            onClick={onAlbumClick}
          />
        ))}
      </div>
    );
  },
);

LibraryAlbumList.displayName = "LibraryAlbumList";
