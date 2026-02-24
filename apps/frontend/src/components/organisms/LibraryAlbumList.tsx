import { LibraryAlbum } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { LibraryAlbumCard } from "../molecules/LibraryAlbumCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface LibraryAlbumListProps {
  albums: LibraryAlbum[];
}

interface LibraryAlbumListItemProps {
  album: LibraryAlbum;
}

const LibraryAlbumListItem: FC<LibraryAlbumListItemProps> = memo(({ album }) => {
  return <LibraryAlbumCard album={album} />;
});

export const LibraryAlbumList: FC<LibraryAlbumListProps> = memo(({ albums }) => {
  const { t } = useTranslation();

  const renderItem = useCallback((album: LibraryAlbum) => {
    return <LibraryAlbumListItem album={album} />;
  }, []);

  if (!albums || albums.length === 0) {
    return (
      <div className="text-text-secondary mt-10 text-center">
        <p>{t("artist.noDiscography", "No albums found")}</p>
      </div>
    );
  }

  return <VirtualGrid items={albums} itemKey={(album) => album.path} renderItem={renderItem} />;
});

LibraryAlbumList.displayName = "LibraryAlbumList";
