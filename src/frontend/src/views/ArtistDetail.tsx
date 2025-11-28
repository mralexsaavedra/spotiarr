import { FC } from "react";
import { useParams } from "react-router-dom";
import { DetailLayout } from "../components/layouts/DetailLayout";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, isLoading, error } = useArtistDetailQuery(id || null);

  const hasArtist = !!artist && !!id && !error;

  const headerMeta =
    hasArtist && artist
      ? `Top tracks: ${artist.topTracks.length}`
      : error === "missing_user_access_token"
        ? "Connect Spotify to view artist details."
        : error === "spotify_rate_limited"
          ? "Spotify rate limited. Please try again later."
          : error
            ? "Failed to load artist details."
            : undefined;

  return (
    <DetailLayout
      imageUrl={artist?.image ?? null}
      fallbackIconClass="fa-solid fa-user"
      imageShape="circle"
      typeLabel="Artist"
      title={artist?.name || "Artist"}
      description={headerMeta}
      spotifyUrl={artist?.spotifyUrl ?? null}
      isLoading={isLoading}
      emptyMessage={headerMeta}
    >
      {hasArtist && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">Popular</h2>
          <div className="space-y-1">
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
        </div>
      )}
    </DetailLayout>
  );
};
