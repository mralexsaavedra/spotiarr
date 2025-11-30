import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { Track } from "../../types/track";
import { ArtistList } from "./ArtistList";

interface PlaylistMetadataProps {
  type: string;
  tracks: Track[];
}

export const PlaylistMetadata: FC<PlaylistMetadataProps> = ({ type, tracks }) => {
  const firstTrack = tracks[0];
  const artists = firstTrack?.artists || (firstTrack?.artist ? [{ name: firstTrack.artist }] : []);

  const typeLower = type.toLowerCase();

  if (typeLower === PlaylistTypeEnum.Album && artists.length > 0) {
    return (
      <ArtistList
        artists={artists}
        className="font-bold text-white"
        linkClassName="hover:underline"
        onLinkClick={(e) => e.stopPropagation()}
      />
    );
  }

  if (typeLower === PlaylistTypeEnum.Track && artists.length > 0) {
    return (
      <>
        <ArtistList
          artists={artists}
          className="font-bold text-white"
          linkClassName="hover:underline"
          onLinkClick={(e) => e.stopPropagation()}
        />
        <span className="text-text-primary">•</span>
        {firstTrack?.albumUrl ? (
          <Link
            to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(firstTrack.albumUrl)}`}
            className="font-medium text-white hover:underline transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {firstTrack?.album || "Unknown Album"}
          </Link>
        ) : (
          <span className="font-medium text-white">{firstTrack?.album || "Unknown Album"}</span>
        )}
      </>
    );
  }

  return <span className="font-bold">SpotiArr</span>;
};
