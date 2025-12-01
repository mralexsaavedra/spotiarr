import { ArtistRelease } from "@spotiarr/shared";
import { FC, MouseEvent, useCallback } from "react";
import { useArtistDiscography } from "../../hooks/useArtistDiscography";
import { Playlist, PlaylistStatusEnum } from "../../types/playlist";
import { getPlaylistStatus } from "../../utils/playlist";
import { Button } from "../atoms/Button";
import { ArtistDiscographyFilters } from "../molecules/ArtistDiscographyFilters";
import { ReleaseCard } from "./ReleaseCard";

interface ArtistDiscographyProps {
  artistId: string;
  albums: ArtistRelease[];
  playlists?: Playlist[];
  onDownload: (url: string) => void;
  onDiscographyItemClick: (url: string) => void;
}

interface DiscographyItemProps {
  album: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onDiscographyItemClick: (url: string) => void;
  onDownload: (url: string) => void;
}

const DiscographyItem: FC<DiscographyItemProps> = ({
  album,
  isDownloaded,
  isDownloading,
  onDiscographyItemClick,
  onDownload,
}) => {
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
    <ReleaseCard
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
    />
  );
};

export const ArtistDiscography: FC<ArtistDiscographyProps> = ({
  artistId,
  albums,
  playlists,
  onDownload,
  onDiscographyItemClick,
}) => {
  const {
    filter,
    setFilter,
    filteredAlbums,
    visibleItems,
    isLoadingMore,
    handleShowMore,
    canShowMore,
  } = useArtistDiscography({ artistId, initialAlbums: albums });

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAlbums.slice(0, visibleItems).map((album) => {
              const playlist = playlists?.find((p) => p.spotifyUrl === album.spotifyUrl);
              const status = playlist ? getPlaylistStatus(playlist) : undefined;

              const isDownloaded = status === PlaylistStatusEnum.Completed;
              const isDownloading =
                status !== undefined && !isDownloaded && status !== PlaylistStatusEnum.Error;

              return (
                <DiscographyItem
                  key={album.albumId}
                  album={album}
                  isDownloaded={isDownloaded}
                  isDownloading={isDownloading}
                  onDiscographyItemClick={onDiscographyItemClick}
                  onDownload={onDownload}
                />
              );
            })}
          </div>

          {canShowMore && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleShowMore}
                loading={isLoadingMore}
                variant="secondary"
                size="md"
              >
                Show more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
