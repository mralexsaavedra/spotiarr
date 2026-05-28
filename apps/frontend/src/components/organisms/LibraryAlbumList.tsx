import { LibraryAlbum } from "@spotiarr/shared";
import { FC, memo } from "react";
import { useTranslation } from "react-i18next";
import { LibraryAlbumGridCard } from "../molecules/LibraryAlbumGridCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

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
      <VirtualGrid
        items={albums}
        itemKey={(album) => album.path}
        renderItem={(album) => (
          <LibraryAlbumGridCard album={album} artistName={artistName} onClick={onAlbumClick} />
        )}
      />
    );
  },
);

LibraryAlbumList.displayName = "LibraryAlbumList";
