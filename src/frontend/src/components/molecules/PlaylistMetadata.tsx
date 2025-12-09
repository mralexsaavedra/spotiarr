import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { Track } from "../../types";
import { ArtistLinks } from "./ArtistLinks";

interface PlaylistMetadataProps {
  type: string;
  tracks: Track[];
  owner?: string;
  ownerUrl?: string;
}

interface MetadataRendererProps {
  artists: { name: string; url?: string }[];
  onClick: (e: MouseEvent) => void;
  firstTrack?: Track;
  owner?: string;
  ownerUrl?: string;
}

const AlbumMetadata: FC<MetadataRendererProps> = ({ artists, onClick }) => (
  <ArtistLinks
    artists={artists}
    className="font-bold text-white"
    linkClassName="hover:underline"
    onLinkClick={onClick}
  />
);

const TrackMetadata: FC<MetadataRendererProps> = ({ artists, firstTrack, onClick }) => (
  <>
    <ArtistLinks
      artists={artists}
      className="font-bold text-white"
      linkClassName="hover:underline"
      onLinkClick={onClick}
    />
    <span className="mx-1 text-text-primary">•</span>
    {firstTrack?.albumUrl ? (
      <Link
        to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(firstTrack.albumUrl)}`}
        className="font-medium text-white transition-colors hover:underline"
        onClick={onClick}
      >
        {firstTrack?.album || "Unknown Album"}
      </Link>
    ) : (
      <span className="font-medium text-white">{firstTrack?.album || "Unknown Album"}</span>
    )}
  </>
);

const DefaultMetadata: FC<MetadataRendererProps> = () => (
  <span className="font-bold">SpotiArr</span>
);

const PlaylistOwnerMetadata: FC<MetadataRendererProps> = ({ owner, ownerUrl, onClick }) => {
  if (!owner) return <DefaultMetadata artists={[]} onClick={onClick} />;

  return (
    <>
      {ownerUrl ? (
        <a
          href={ownerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-white transition-colors hover:underline"
          onClick={onClick}
        >
          {owner}
        </a>
      ) : (
        <span className="font-bold">{owner}</span>
      )}
    </>
  );
};

const METADATA_RENDERERS: Record<string, FC<MetadataRendererProps>> = {
  [PlaylistTypeEnum.Album]: AlbumMetadata,
  [PlaylistTypeEnum.Track]: TrackMetadata,
  [PlaylistTypeEnum.Playlist]: PlaylistOwnerMetadata,
};

export const PlaylistMetadata: FC<PlaylistMetadataProps> = ({ type, tracks, owner, ownerUrl }) => {
  const firstTrack = tracks[0];
  const typeLower = type.toLowerCase();

  const artists = useMemo(() => {
    const rawArtists =
      firstTrack?.artists || (firstTrack?.artist ? [{ name: firstTrack.artist }] : []);

    if (typeLower === PlaylistTypeEnum.Album && rawArtists.length > 1) {
      const primaryArtist = rawArtists.find((a) => a.name === firstTrack?.artist);
      return primaryArtist ? [primaryArtist] : [rawArtists[0]];
    }

    return rawArtists;
  }, [firstTrack, typeLower]);

  const handleStopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const Renderer = METADATA_RENDERERS[typeLower] || DefaultMetadata;

  return (
    <Renderer
      artists={artists}
      firstTrack={firstTrack}
      onClick={handleStopPropagation}
      owner={owner}
      ownerUrl={ownerUrl}
    />
  );
};
