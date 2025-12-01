import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Path } from "../../routes/routes";
import { Track } from "../../types/track";
import { ArtistList } from "./ArtistList";

interface PlaylistMetadataProps {
  type: string;
  tracks: Track[];
}

interface MetadataRendererProps {
  artists: { name: string; url?: string }[];
  onStopPropagation: (e: MouseEvent) => void;
  firstTrack?: Track;
}

const AlbumMetadata: FC<MetadataRendererProps> = ({ artists, onStopPropagation }) => (
  <ArtistList
    artists={artists}
    className="font-bold text-white"
    linkClassName="hover:underline"
    onLinkClick={onStopPropagation}
  />
);

const TrackMetadata: FC<MetadataRendererProps> = ({ artists, firstTrack, onStopPropagation }) => (
  <>
    <ArtistList
      artists={artists}
      className="font-bold text-white"
      linkClassName="hover:underline"
      onLinkClick={onStopPropagation}
    />
    <span className="text-text-primary mx-1">•</span>
    {firstTrack?.albumUrl ? (
      <Link
        to={`${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(firstTrack.albumUrl)}`}
        className="font-medium text-white hover:underline transition-colors"
        onClick={onStopPropagation}
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

const METADATA_RENDERERS: Record<string, FC<MetadataRendererProps>> = {
  [PlaylistTypeEnum.Album]: AlbumMetadata,
  [PlaylistTypeEnum.Track]: TrackMetadata,
};

export const PlaylistMetadata: FC<PlaylistMetadataProps> = ({ type, tracks }) => {
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

  if (artists.length === 0) {
    return <DefaultMetadata artists={[]} onStopPropagation={handleStopPropagation} />;
  }

  const Renderer = METADATA_RENDERERS[typeLower] || DefaultMetadata;

  return (
    <Renderer artists={artists} firstTrack={firstTrack} onStopPropagation={handleStopPropagation} />
  );
};
