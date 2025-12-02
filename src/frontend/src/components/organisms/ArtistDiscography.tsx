import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { useArtistDiscography } from "../../hooks/useArtistDiscography";
import { useDownloadStatus } from "../../hooks/useDownloadStatus";
import { Button } from "../atoms/Button";
import { ArtistDiscographyFilters } from "../molecules/ArtistDiscographyFilters";
import { VirtualGrid } from "../molecules/VirtualGrid";
import { AlbumCard } from "./AlbumCard";

interface ArtistDiscographyProps {
  artistId: string;
  albums: ArtistRelease[];
  onDownload: (url: string) => void;
  onDiscographyItemClick: (url: string) => void;
  onArtistClick: (artistId: string) => void;
  pageSize: number;
}

interface DiscographyItemProps {
  album: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onDiscographyItemClick: (url: string) => void;
  onDownload: (url: string) => void;
  onArtistClick: (artistId: string) => void;
}

const DiscographyItem: FC<DiscographyItemProps> = memo(
  ({ album, isDownloaded, isDownloading, onDiscographyItemClick, onDownload, onArtistClick }) => {
    const handleCardClick = useCallback(() => {
      if (album.spotifyUrl) {
        onDiscographyItemClick(album.spotifyUrl);
      }
    }, [album.spotifyUrl, onDiscographyItemClick]);

    const handleDownloadClick = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        if (album.spotifyUrl) {
          onDownload(album.spotifyUrl);
        }
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

export const ArtistDiscography: FC<ArtistDiscographyProps> = ({
  artistId,
  albums,
  onDownload,
  onDiscographyItemClick,
  onArtistClick,
  pageSize,
}) => {
  const {
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
  } = useArtistDiscography({ artistId, initialAlbums: albums, pageSize });

  const { isPlaylistDownloaded, isPlaylistDownloading } = useDownloadStatus();

  const displayedItems = useMemo(
    () => filteredAlbums.slice(0, visibleItems),
    [filteredAlbums, visibleItems],
  );

  const renderDiscographyItem = useCallback(
    (album: ArtistRelease) => {
      const isDownloaded = isPlaylistDownloaded(album.spotifyUrl);
      const isDownloading = isPlaylistDownloading(album.spotifyUrl);

      return (
        <DiscographyItem
          key={album.albumId}
          album={album}
          isDownloaded={isDownloaded}
          isDownloading={isDownloading}
          onDiscographyItemClick={onDiscographyItemClick}
          onDownload={onDownload}
          onArtistClick={onArtistClick}
        />
      );
    },
    [
      isPlaylistDownloaded,
      isPlaylistDownloading,
      onDiscographyItemClick,
      onDownload,
      onArtistClick,
    ],
  );

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Discography</h2>
      </div>

      <ArtistDiscographyFilters currentFilter={filter} onFilterChange={setFilter} />

      {filteredAlbums.length === 0 ? (
        <div className="py-12 text-center text-text-secondary bg-white/5 rounded-lg">
          <p>No releases found for this category.</p>
        </div>
      ) : (
        <>
          <VirtualGrid
            items={displayedItems}
            itemKey={(album) => album.albumId}
            renderItem={renderDiscographyItem}
            footer={
              canShowMore ? (
                <div className="flex justify-center mt-8 pb-8">
                  <Button
                    onClick={handleShowMore}
                    loading={isLoadingMore}
                    variant="secondary"
                    size="md"
                  >
                    Show more
                  </Button>
                </div>
              ) : undefined
            }
          />
        </>
      )}
    </div>
  );
};
