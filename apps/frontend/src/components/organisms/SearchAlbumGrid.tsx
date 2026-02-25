import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useDownloadStatusContext } from "@/contexts/DownloadStatusContext";
import { AlbumCard } from "../molecules/AlbumCard";
import { VirtualGrid } from "../molecules/VirtualGrid";

interface SearchAlbumGridProps {
  albums: ArtistRelease[];
  onClick: (spotifyUrl: string) => void;
  onArtistClick: (artistId: string) => void;
  onDownload: (url: string) => void;
}

interface SearchAlbumItemProps {
  album: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onClick: (spotifyUrl: string) => void;
  onArtistClick: (artistId: string) => void;
  onDownload: (url: string) => void;
}

const SearchAlbumItem: FC<SearchAlbumItemProps> = memo(
  ({ album, isDownloaded, isDownloading, onClick, onArtistClick, onDownload }) => {
    const handleCardClick = useCallback(() => {
      if (album.spotifyUrl) onClick(album.spotifyUrl);
    }, [album.spotifyUrl, onClick]);

    const handleDownloadClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        if (album.spotifyUrl) onDownload(album.spotifyUrl);
      },
      [album.spotifyUrl, onDownload],
    );

    return (
      <AlbumCard
        albumId={album.albumId}
        artistId={album.artistId}
        albumName={album.albumName}
        artistName={album.artistName}
        coverUrl={album.coverUrl}
        releaseDate={album.releaseDate}
        spotifyUrl={album.spotifyUrl}
        isDownloaded={isDownloaded}
        isDownloading={isDownloading}
        albumType={album.albumType}
        onCardClick={handleCardClick}
        onDownloadClick={handleDownloadClick}
        onArtistClick={onArtistClick}
      />
    );
  },
);

export const SearchAlbumGrid: FC<SearchAlbumGridProps> = ({
  albums,
  onClick,
  onArtistClick,
  onDownload,
}) => {
  const { getBulkPlaylistStatus } = useDownloadStatusContext();

  const downloadStatesMap = useMemo(() => {
    const items = albums.map((album) => ({
      url: album.spotifyUrl,
      totalTracks: album.totalTracks,
    }));
    return getBulkPlaylistStatus(items);
  }, [albums, getBulkPlaylistStatus]);

  const renderItem = useCallback(
    (album: ArtistRelease) => {
      const downloadState = album.spotifyUrl ? downloadStatesMap.get(album.spotifyUrl) : undefined;
      return (
        <SearchAlbumItem
          album={album}
          isDownloaded={downloadState?.isDownloaded ?? false}
          isDownloading={downloadState?.isDownloading ?? false}
          onClick={onClick}
          onArtistClick={onArtistClick}
          onDownload={onDownload}
        />
      );
    },
    [downloadStatesMap, onClick, onArtistClick, onDownload],
  );

  return <VirtualGrid items={albums} itemKey={(album) => album.albumId} renderItem={renderItem} />;
};
