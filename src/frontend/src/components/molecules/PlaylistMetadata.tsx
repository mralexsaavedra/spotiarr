import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { Track } from "../../types/track";
import { getSpotifyIdFromUrl } from "../../utils/spotify";

interface PlaylistMetadataProps {
  type: string;
  tracks: Track[];
}

export const PlaylistMetadata: FC<PlaylistMetadataProps> = ({ type, tracks }) => {
  const firstTrack = tracks[0];
  const artists = firstTrack?.artists || (firstTrack?.artist ? [{ name: firstTrack.artist }] : []);

  const renderArtists = () => (
    <span className="font-bold text-white">
      {artists.map((artist, i) => {
        const artistId = artist.url ? getSpotifyIdFromUrl(artist.url) : null;
        return (
          <span key={`${artist.name}-${i}`}>
            {artistId ? (
              <Link
                to={Path.ARTIST_DETAIL.replace(":id", artistId)}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {artist.name}
              </Link>
            ) : (
              artist.name
            )}
            {i < artists.length - 1 && ", "}
          </span>
        );
      })}
    </span>
  );

  const typeLower = type.toLowerCase();

  if (typeLower === PlaylistTypeEnum.Album && artists.length > 0) {
    return renderArtists();
  }

  if (typeLower === PlaylistTypeEnum.Track && artists.length > 0) {
    return (
      <>
        {renderArtists()}
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
