import { FollowedArtist } from "@spotiarr/shared";
import { FC, useCallback } from "react";
import { SearchArtistCard } from "../molecules/SearchArtistCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface SearchArtistGridProps {
  artists: FollowedArtist[];
  onClick: (id: string) => void;
}

export const SearchArtistGrid: FC<SearchArtistGridProps> = ({ artists, onClick }) => {
  const renderItem = useCallback(
    (artist: FollowedArtist) => <SearchArtistCard artist={artist} onClick={onClick} />,
    [onClick],
  );

  return <VirtualGrid items={artists} itemKey={(artist) => artist.id} renderItem={renderItem} />;
};
