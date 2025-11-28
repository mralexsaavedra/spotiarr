import { PlaylistTypeEnum } from "@spotiarr/shared";
import { FC, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlaylistActions } from "../components/molecules/PlaylistActions";
import { PlaylistNotFound } from "../components/molecules/PlaylistNotFound";
import { PlaylistTracksList } from "../components/organisms/PlaylistTracksList";
import { PlaylistDetailSkeleton } from "../components/skeletons/PlaylistDetailSkeleton";
import { useDeletePlaylistMutation } from "../hooks/mutations/useDeletePlaylistMutation";
import { useRetryFailedTracksMutation } from "../hooks/mutations/useRetryFailedTracksMutation";
import { useRetryTrackMutation } from "../hooks/mutations/useRetryTrackMutation";
import { useUpdatePlaylistMutation } from "../hooks/mutations/useUpdatePlaylistMutation";
import { usePlaylistsQuery } from "../hooks/queries/usePlaylistsQuery";
import { useTracksQuery } from "../hooks/queries/useTracksQuery";
import { Path } from "../routes/routes";
import { TrackStatus } from "../types/track";

export const PlaylistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: playlists = [] } = usePlaylistsQuery();
  const updatePlaylist = useUpdatePlaylistMutation();
  const deletePlaylist = useDeletePlaylistMutation();
  const retryFailedTracks = useRetryFailedTracksMutation();
  const { data: tracks = [] } = useTracksQuery(id || "");
  const { mutate: retryTrack } = useRetryTrackMutation(id || "");

  const playlist = useMemo(() => playlists.find((p) => p.id === id), [playlists, id]);

  const { completedCount, totalCount, hasFailed } = useMemo(() => {
    const completed = tracks.filter((t) => t.status === TrackStatus.Completed).length;
    const failed = tracks.some((t) => t.status === TrackStatus.Error);
    return {
      completedCount: completed,
      totalCount: tracks.length,
      hasFailed: failed,
    };
  }, [tracks]);

  const displayTitle = useMemo(() => {
    if (!playlist) return "Unnamed Playlist";

    // For Album and Track types, the backend stores "Artist - Name"
    // We want to display just "Name"
    if (playlist.type === PlaylistTypeEnum.Album) {
      if (tracks.length > 0 && tracks[0].album) {
        return tracks[0].album;
      }
      // Fallback: try to strip artist from name
      const parts = (playlist.name || "").split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : playlist.name;
    }

    if (playlist.type === PlaylistTypeEnum.Track) {
      if (tracks.length > 0 && tracks[0].name) {
        return tracks[0].name;
      }
      // Fallback
      const parts = (playlist.name || "").split(" - ");
      return parts.length > 1 ? parts.slice(1).join(" - ") : playlist.name;
    }

    return playlist.name || "Unnamed Playlist";
  }, [playlist, tracks]);

  const typeLabel = useMemo(() => {
    if (!playlist?.type) return "Playlist";
    return playlist.type.charAt(0).toUpperCase() + playlist.type.slice(1);
  }, [playlist?.type]);

  const handleGoHome = useCallback(() => {
    navigate(Path.HOME);
  }, [navigate]);

  const handleToggleActive = useCallback(() => {
    if (!playlist) return;
    updatePlaylist.mutate({
      id: playlist.id,
      data: { subscribed: !playlist.subscribed },
    });
  }, [updatePlaylist, playlist]);

  const handleDelete = useCallback(() => {
    if (!playlist) return;
    if (window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      deletePlaylist.mutate(playlist.id);
      navigate(Path.HOME);
    }
  }, [deletePlaylist, playlist, navigate]);

  const handleRetryFailed = useCallback(() => {
    if (!playlist || !hasFailed) return;
    retryFailedTracks.mutate(playlist.id);
  }, [hasFailed, retryFailedTracks, playlist]);

  const handleRetryTrack = useCallback(
    (trackId: string) => {
      retryTrack(trackId);
    },
    [retryTrack],
  );

  const renderMetadata = useMemo(() => {
    if (!playlist) return null;

    const firstTrack = tracks[0];
    const artists =
      firstTrack?.artists || (firstTrack?.artist ? [{ name: firstTrack.artist }] : []);

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

    if (playlist.type === PlaylistTypeEnum.Album && artists.length > 0) {
      return renderArtists();
    }

    if (playlist.type === PlaylistTypeEnum.Track && artists.length > 0) {
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

    // Default for Playlist and Artist types
    return <span className="font-bold">SpotiArr</span>;
  }, [playlist, tracks]);

  if (!playlist) {
    // If we are still loading playlists, show skeleton
    if (playlists.length === 0) {
      return <PlaylistDetailSkeleton />;
    }
    return <PlaylistNotFound onGoHome={handleGoHome} />;
  }

  return (
    <div className="flex-1 bg-background overflow-y-auto h-full text-text-primary">
      {/* Header */}
      <div className="bg-gradient-to-b from-zinc-800/80 to-background px-6 md:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Cover Image */}
          <div className="w-48 h-48 md:w-60 md:h-60 shadow-2xl flex-shrink-0">
            {playlist.coverUrl ? (
              <img
                src={playlist.coverUrl}
                alt={playlist.name}
                className="w-full h-full object-cover shadow-lg"
              />
            ) : (
              <div className="w-full h-full bg-background-elevated flex items-center justify-center">
                <i className="fa-solid fa-music text-6xl text-text-secondary" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex-1 min-w-0 space-y-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
              {typeLabel}
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-md break-words">
              {displayTitle}
            </h1>
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5">
                <span>
                  {completedCount} / {totalCount} downloaded
                </span>
                <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
                  style={{
                    width: `${
                      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm font-medium text-text-primary mt-2">
              {renderMetadata}
              <span className="text-text-secondary">•</span>
              <span className="text-text-secondary">{totalCount} songs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-6 md:px-8 py-6 bg-gradient-to-b from-black/20 to-background">
        <PlaylistActions
          isSubscribed={!!playlist.subscribed}
          hasFailed={hasFailed}
          isRetrying={retryFailedTracks.isPending}
          onToggleSubscription={handleToggleActive}
          onRetryFailed={handleRetryFailed}
          onDelete={handleDelete}
          spotifyUrl={playlist.spotifyUrl}
        />
      </div>

      {/* Tracks List */}
      <div className="px-6 md:px-8 pb-8">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[16px_1fr_1fr_180px] gap-4 px-4 py-2 border-b border-white/10 text-text-secondary text-sm uppercase tracking-wider mb-4 sticky top-0 bg-background z-10">
          <div className="text-center">#</div>
          <div>Title</div>
          <div className="hidden md:block">Album</div>
          <div className="text-right">
            <i className="fa-regular fa-clock" />
          </div>
        </div>

        <PlaylistTracksList tracks={tracks} onRetryTrack={handleRetryTrack} />
      </div>
    </div>
  );
};
