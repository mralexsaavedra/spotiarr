import { ArtistRelease } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { SearchAlbumCard } from "../molecules/SearchAlbumCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface SearchAlbumGridProps {
  albums: ArtistRelease[];
  onClick: (album: ArtistRelease) => void;
  onDownload: (e: React.MouseEvent, url: string) => void;
}

export const SearchAlbumGrid: FC<SearchAlbumGridProps> = ({ albums, onClick, onDownload }) => {
  const renderItem = useCallback(
    (album: ArtistRelease) => (
      <SearchAlbumCard album={album} onClick={onClick} onDownload={onDownload} />
    ),
    [onClick, onDownload],
  );

  return <VirtualGrid items={albums} itemKey={(album) => album.albumId} renderItem={renderItem} />;
};
