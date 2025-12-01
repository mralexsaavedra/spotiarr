import { FC, memo } from "react";
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
}

const ArtistListItem: FC<ArtistListItemProps> = memo(({ artist }) => {
  return (
    <ArtistCard
      id={artist.id}
      name={artist.name}
      image={artist.image}
      spotifyUrl={artist.spotifyUrl}
    />
  );
});

interface ArtistListProps {
  artists: Artist[];
}

export const ArtistList: FC<ArtistListProps> = ({ artists }) => {
  return (
    <VirtualGrid
      items={artists}
      itemKey={(artist) => artist.id}
      renderItem={(artist) => <ArtistListItem artist={artist} />}
    />
  );
};
