import { LibraryAlbum } from "@spotiarr/shared";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { LibraryAlbumCard } from "../molecules/LibraryAlbumCard";

interface LibraryAlbumListProps {
  albums: LibraryAlbum[];
}

export const LibraryAlbumList: FC<LibraryAlbumListProps> = ({ albums }) => {
  const { t } = useTranslation();

  if (!albums || albums.length === 0) {
    return (
      <div className="text-text-secondary mt-10 text-center">
        <p>{t("artist.noDiscography", "No albums found")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
      {albums.map((album) => (
        <LibraryAlbumCard key={album.path} album={album} />
      ))}
    </div>
  );
};
