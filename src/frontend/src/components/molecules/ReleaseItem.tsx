import { ArtistRelease } from "@spotiarr/shared";
import { FC, memo, MouseEvent, useCallback } from "react";
import { ReleaseCard } from "../organisms/ReleaseCard";

interface ReleaseItemProps {
  release: ArtistRelease;
  isDownloaded: boolean;
  onReleaseClick: (release: { spotifyUrl?: string | null; albumId: string }) => void;
  onDownloadRelease: (e: MouseEvent, spotifyUrl: string) => void;
}

export const ReleaseItem: FC<ReleaseItemProps> = memo(
  ({ release, isDownloaded, onReleaseClick, onDownloadRelease }: ReleaseItemProps) => {
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
        albumType={release.albumType}
        onCardClick={handleCardClick}
        onDownloadClick={handleDownloadClick}
      />
    );
  },
);
