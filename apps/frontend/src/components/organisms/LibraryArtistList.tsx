import { LibraryArtist } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { LibraryArtistCard } from "../molecules/LibraryArtistCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface LibraryArtistListProps {
  artists: LibraryArtist[];
  onArtistClick?: (artist: LibraryArtist) => void;
}

interface LibraryArtistListItemProps {
  artist: LibraryArtist;
  onClick?: (artist: LibraryArtist) => void;
}

const LibraryArtistListItem: FC<LibraryArtistListItemProps> = memo(({ artist, onClick }) => {
  return <LibraryArtistCard artist={artist} onClick={onClick} />;
});

export const LibraryArtistList: FC<LibraryArtistListProps> = memo(({ artists, onArtistClick }) => {
  const handleArtistClick = useCallback(
    (artist: LibraryArtist) => {
      onArtistClick?.(artist);
    },
    [onArtistClick],
  );

  const renderItem = useCallback(
    (artist: LibraryArtist) => (
      <LibraryArtistListItem artist={artist} onClick={handleArtistClick} />
    ),
    [handleArtistClick],
  );

  return <VirtualGrid items={artists} itemKey={(artist) => artist.path} renderItem={renderItem} />;
});

LibraryArtistList.displayName = "LibraryArtistList";
