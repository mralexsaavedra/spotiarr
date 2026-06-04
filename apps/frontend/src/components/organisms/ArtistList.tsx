import type { FollowedArtist } from "@spotiarr/shared";
import { type FC, memo, useCallback } from "react";
import { ArtistCard } from "../molecules/ArtistCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface ArtistListItemProps {
  artist: FollowedArtist;
  onClick: (id: string) => void;
}

const ArtistListItem: FC<ArtistListItemProps> = memo(({ artist, onClick }) => {
  return (
    <ArtistCard
      id={artist.id}
      name={artist.name}
      image={artist.image}
      spotifyUrl={artist.spotifyUrl ?? null}
      onClick={onClick}
    />
  );
});

interface ArtistListProps {
  artists: FollowedArtist[];
  onClick: (id: string) => void;
}

export const ArtistList: FC<ArtistListProps> = ({ artists, onClick }) => {
  const renderItem = useCallback(
    (artist: FollowedArtist) => <ArtistListItem artist={artist} onClick={onClick} />,
    [onClick],
  );

  return <VirtualGrid items={artists} itemKey={(artist) => artist.id} renderItem={renderItem} />;
};
