import { LibraryArtist } from "@spotiarr/shared";
import { FC, memo, useCallback } from "react";
import { LibraryArtistCard } from "../molecules/LibraryArtistCard";

interface LibraryArtistListProps {
  artists: LibraryArtist[];
  onArtistClick?: (artist: LibraryArtist) => void;
}

export const LibraryArtistList: FC<LibraryArtistListProps> = memo(({ artists, onArtistClick }) => {
  const handleArtistClick = useCallback(
    (artist: LibraryArtist) => {
      onArtistClick?.(artist);
    },
    [onArtistClick],
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {artists.map((artist) => (
        <LibraryArtistCard key={artist.path} artist={artist} onClick={handleArtistClick} />
      ))}
    </div>
  );
});

LibraryArtistList.displayName = "LibraryArtistList";
