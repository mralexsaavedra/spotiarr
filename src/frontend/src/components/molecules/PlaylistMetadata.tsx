import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC } from "react";
import { Track } from "../../types/track";

interface PlaylistMetadataProps {
  type: string;
  tracks: Track[];
}

export const PlaylistMetadata: FC<PlaylistMetadataProps> = ({ type, tracks }) => {
  const firstTrack = tracks[0];
  const artists = firstTrack?.artists || (firstTrack?.artist ? [{ name: firstTrack.artist }] : []);

  const renderArtists = () => (
    <span className="font-bold text-white">
      {artists.map((artist, i) => (
        <span key={`${artist.name}-${i}`}>
          {artist.url ? (
            <a
              href={artist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {artist.name}
            </a>
          ) : (
            artist.name
          )}
          {i < artists.length - 1 && ", "}
        </span>
      ))}
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
          <a
            href={firstTrack.albumUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white hover:underline transition-colors"
          >
            {firstTrack?.album || "Unknown Album"}
          </a>
        ) : (
          <span className="font-medium text-white">{firstTrack?.album || "Unknown Album"}</span>
        )}
      </>
    );
  }

  return <span className="font-bold">SpotiArr</span>;
};
