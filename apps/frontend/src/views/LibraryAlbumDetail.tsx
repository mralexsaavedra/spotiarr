import { faMusic, faPause, faPlay, faShuffle } from "@fortawesome/free-solid-svg-icons";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/atoms/Button";
import { Loading } from "@/components/atoms/Loading";
import { EmptyState } from "@/components/molecules/EmptyState";
import { SpotifyLinkButton } from "@/components/molecules/SpotifyLinkButton";
import { AlbumPageLayout } from "@/components/organisms/AlbumPageLayout";
import { useLibraryAlbumDetailController } from "@/hooks/controllers/useLibraryAlbumDetailController";
import { cn } from "@/utils/cn";

export const LibraryAlbumDetail: FC = () => {
  const { t } = useTranslation();
  const {
    artistName,
    album,
    tracks,
    coverUrl,
    isLoading,
    error,
    isNotFound,
    playlistType,
    backToArtistPath,
    currentTrackId,
    isPlaying,
    onPlayTrack,
    onPauseTrack,
    hasPlayableTracks,
    onPlayPlaylist,
    onPausePlaylist,
    isShuffleActive,
    onToggleShuffle,
  } = useLibraryAlbumDetailController();

  if (isLoading) {
    return (
      <main className="bg-background flex flex-1 items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <Loading />
          <p className="text-text-secondary">{t("library.album.loading")}</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <div className="space-y-4">
          <EmptyState icon={faMusic} title={t("library.album.error")} description={String(error)} />
          <div className="text-center">
            <Link
              to={backToArtistPath}
              className="text-primary hover:text-primary/80 focus-visible:ring-primary inline-flex rounded-md px-3 py-2 font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("library.album.backToArtist")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isNotFound || !album) {
    return (
      <main className="bg-background flex flex-1 items-center justify-center p-6 text-white">
        <div className="space-y-4">
          <EmptyState
            icon={faMusic}
            title={t("library.album.notFound")}
            description={t("library.album.notFoundDescription")}
          />
          <div className="text-center">
            <Link
              to={backToArtistPath}
              className="text-primary hover:text-primary/80 focus-visible:ring-primary inline-flex rounded-md px-3 py-2 font-medium underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {t("library.album.backToArtist")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <AlbumPageLayout
        title={album.name}
        type={playlistType}
        coverUrl={coverUrl}
        description={artistName}
        totalCount={tracks.length}
        tracks={tracks}
        onPlayTrack={onPlayTrack}
        onPauseTrack={onPauseTrack}
        currentTrackId={currentTrackId}
        isPlaying={isPlaying}
        emptyTitle={t("library.album.emptyTracks")}
        emptyDescription={t("library.album.emptyTracks")}
        actions={
          <div className="to-background bg-gradient-to-b from-black/20 px-6 py-6 md:px-8">
            <div className="flex items-center gap-3 md:gap-4">
              {hasPlayableTracks ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="!h-12 !w-12 justify-center !rounded-full !p-0 shadow-lg transition-transform hover:scale-105 md:!h-14 md:!w-14"
                  onClick={isPlaying ? onPausePlaylist : onPlayPlaylist}
                  title={isPlaying ? t("library.album.pauseAlbum") : t("library.album.playAlbum")}
                  ariaLabel={
                    isPlaying ? t("library.album.pauseAlbum") : t("library.album.playAlbum")
                  }
                  icon={isPlaying ? faPause : faPlay}
                >
                  <span className="sr-only">
                    {isPlaying ? t("library.album.pause") : t("library.album.play")}
                  </span>
                </Button>
              ) : null}
              {hasPlayableTracks && onToggleShuffle ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={onToggleShuffle}
                  title={t("playlist.actions.shufflePlay")}
                  ariaLabel={t("playlist.actions.shufflePlay")}
                  icon={faShuffle}
                  className={cn(
                    "!h-10 !w-10 justify-center !rounded-full !p-0 transition-transform hover:scale-105",
                    isShuffleActive
                      ? "text-green-500"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <span className="sr-only">{t("playlist.actions.shufflePlay")}</span>
                </Button>
              ) : null}
              <SpotifyLinkButton
                provider="spotify"
                entityType="album"
                id={`${artistName}::${album.name}`}
                name={`${artistName} ${album.name}`}
              />
            </div>
          </div>
        }
      />
    </main>
  );
};
