import { FC, memo, useCallback } from "react";
import { VirtualGrid } from "../molecules/VirtualGrid";
import { ArtistCard } from "./ArtistCard";

interface Artist {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
}

interface ArtistListItemProps {
  artist: Artist;
  onClick: (id: string) => void;
}

const ArtistListItem: FC<ArtistListItemProps> = memo(({ artist, onClick }) => {
  return (
    <ArtistCard
      id={artist.id}
      name={artist.name}
      image={artist.image}
      spotifyUrl={artist.spotifyUrl}
      onClick={onClick}
    />
  );
});

interface ArtistListProps {
  artists: Artist[];
  onClick: (id: string) => void;
}

export const ArtistList: FC<ArtistListProps> = ({ artists, onClick }) => {
  const renderItem = useCallback(
    (artist: Artist) => <ArtistListItem artist={artist} onClick={onClick} />,
    [onClick],
  );

  return <VirtualGrid items={artists} itemKey={(artist) => artist.id} renderItem={renderItem} />;
};
