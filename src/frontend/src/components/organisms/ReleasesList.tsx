import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { useGridColumns } from "../../hooks/useGridColumns";
import { PlaylistStatusEnum, type Playlist } from "../../types/playlist";
import { getPlaylistStatus } from "../../utils/playlist";
import { ReleaseCard } from "./ReleaseCard";

interface ReleaseItemProps {
  release: ArtistRelease;
  isDownloaded: boolean;
  isDownloading: boolean;
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
}

const ReleaseItem: FC<ReleaseItemProps> = memo(
  ({ release, isDownloaded, isDownloading, onReleaseClick, onDownloadRelease }) => {
    const handleCardClick = useCallback(() => {
      onReleaseClick(release);
    }, [onReleaseClick, release]);

    const handleDownloadClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (release.spotifyUrl) {
          onDownloadRelease(e, release.spotifyUrl);
        }
      },
      [onDownloadRelease, release.spotifyUrl],
    );

    return (
      <ReleaseCard
        albumId={release.albumId}
        artistId={release.artistId}
        albumName={release.albumName}
        artistName={release.artistName}
        coverUrl={release.coverUrl}
        releaseDate={release.releaseDate}
        spotifyUrl={release.spotifyUrl}
        isDownloaded={isDownloaded}
        isDownloading={isDownloading}
        albumType={release.albumType}
        onCardClick={handleCardClick}
        onDownloadClick={handleDownloadClick}
      />
    );
  },
);

interface ReleasesListProps {
  releases: ArtistRelease[];
  playlists: Playlist[];
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
}

export const ReleasesList: FC<ReleasesListProps> = ({
  releases,
  playlists,
  onReleaseClick,
  onDownloadRelease,
}) => {
  const columns = useGridColumns();

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < releases.length; i += columns) {
      result.push(releases.slice(i, i + columns));
    }
    return result;
  }, [releases, columns]);

  return (
    <Virtuoso
      useWindowScroll
      data={rows}
      itemContent={(_, rowItems) => (
        <div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {rowItems.map((release) => {
            const playlist = playlists.find((p) => p.spotifyUrl === release.spotifyUrl);
            const status = playlist ? getPlaylistStatus(playlist) : undefined;

            const isDownloaded = status === PlaylistStatusEnum.Completed;
            const isDownloading =
              status !== undefined && !isDownloaded && status !== PlaylistStatusEnum.Error;

            return (
              <ReleaseItem
                key={`${release.albumId}-${release.artistId}`}
                release={release}
                isDownloaded={isDownloaded}
                isDownloading={isDownloading}
                onReleaseClick={onReleaseClick}
                onDownloadRelease={onDownloadRelease}
              />
            );
          })}
        </div>
      )}
    />
  );
};
