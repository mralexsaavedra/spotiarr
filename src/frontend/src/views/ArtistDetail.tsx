import { FC } from "react";
import { useParams } from "react-router-dom";
import { Loading } from "../components/atoms/Loading";
import { PageHeader } from "../components/atoms/PageHeader";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, isLoading, error } = useArtistDetailQuery(id || null);

  if (!id) {
    return null;
  }

  if (isLoading) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Artist" />
        <Loading message="Loading artist..." />
      </section>
    );
  }

  if (error === "missing_user_access_token") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Artist" />
        <div className="text-text-secondary">Connect Spotify to view artist details.</div>
      </section>
    );
  }

  if (error === "spotify_rate_limited") {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Artist" />
        <div className="text-text-secondary flex items-center gap-2">
          <i className="fa-solid fa-hourglass-half" /> Spotify rate limited. Please try again later.
        </div>
      </section>
    );
  }

  if (error || !artist) {
    return (
      <section className="flex-1 bg-background px-4 md:px-8 py-6">
        <PageHeader title="Artist" />
        <div className="text-text-secondary">Failed to load artist details.</div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-background px-4 md:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-end gap-6 mb-8">
        <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden bg-background-elevated flex-shrink-0">
          {artist.image ? (
            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <i className="fa-solid fa-user text-4xl md:text-6xl text-text-secondary" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-semibold text-text-secondary uppercase">Artist</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary break-words">
            {artist.name}
          </h1>
          <p className="text-sm text-text-secondary">Top tracks: {artist.topTracks.length}</p>
        </div>
      </div>

      <div className="space-y-2">
        {artist.topTracks.map((track, index) => (
          <div
            key={`${track.trackUrl ?? track.name}-${index}`}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-background-elevated transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm text-text-secondary w-6 text-right">{index + 1}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-text-primary truncate">{track.name}</span>
                <span className="text-xs text-text-secondary truncate">{track.artist}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {track.album && (
                <span className="hidden sm:inline text-xs text-text-secondary truncate max-w-[160px]">
                  {track.album}
                </span>
              )}
              {track.trackUrl && (
                <a
                  href={track.trackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-light transition-colors text-sm"
                  title="Open track in Spotify"
                >
                  <i className="fa-brands fa-spotify" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
