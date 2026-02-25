import { FollowedArtist } from "@spotiarr/shared";
import { FC } from "react";
import { ArtistList } from "./ArtistList";

interface SearchArtistGridProps {
  artists: FollowedArtist[];
  onClick: (id: string) => void;
}

export const SearchArtistGrid: FC<SearchArtistGridProps> = ({ artists, onClick }) => {
  return <ArtistList artists={artists} onClick={onClick} />;
};
