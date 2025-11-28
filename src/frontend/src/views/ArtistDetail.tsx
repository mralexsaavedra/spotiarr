import { FC, MouseEvent, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useCreatePlaylistMutation } from "../hooks/mutations/useCreatePlaylistMutation";
import { useArtistDetailQuery } from "../hooks/queries/useArtistDetailQuery";
import { formatDuration } from "../utils/date";

export const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { artist, isLoading, error } = useArtistDetailQuery(id || null);
  const createPlaylistMutation = useCreatePlaylistMutation();

  const hasArtist = !!artist && !!id && !error;

  const statusMessage =
    error === "missing_user_access_token"
      ? "Conecta Spotify para ver los detalles del artista."
      : error === "spotify_rate_limited"
        ? "Límite de velocidad de Spotify. Inténtalo más tarde."
        : error
          ? "Error al cargar los detalles del artista."
          : undefined;

  const followersText =
    artist?.followers && artist.followers > 0
      ? new Intl.NumberFormat("es-ES").format(artist.followers)
      : null;

  const handleDownload = useCallback(
    (url?: string) => {
      if (!url) return;
      createPlaylistMutation.mutate(url);
    },
    [createPlaylistMutation],
  );

  const handleTrackDownloadClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const url = (event.currentTarget as HTMLButtonElement).dataset.url;
      if (!url) return;
      handleDownload(url);
    },
    [handleDownload],
  );

  const topTracks = useMemo(() => artist?.topTracks ?? [], [artist]);

  const topTrackItems = useMemo(
    () =>
      topTracks.map((track, index) => (
        <div
          key={`${track.trackUrl ?? track.name}-${index}`}
          className="group grid grid-cols-[16px_4fr_minmax(80px,1fr)] md:grid-cols-[16px_6fr_minmax(80px,1fr)] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition-colors"
        >
          {/* Index / Download Icon */}
          <button
            onClick={handleTrackDownloadClick}
            data-url={track.trackUrl}
            className="flex items-center justify-center w-4 text-base text-zinc-400 font-medium hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!track.trackUrl}
          >
            <span className="group-hover:hidden">{index + 1}</span>
            <i className="hidden group-hover:block fa-solid fa-download text-white text-sm" />
          </button>

          {/* Title */}
          <div className="flex flex-col min-w-0">
            <a
              href={track.trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-white truncate hover:underline"
            >
              {track.name}
            </a>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-end text-sm text-zinc-400">
            <span>{track.durationMs ? formatDuration(track.durationMs) : "--:--"}</span>
          </div>
        </div>
      )),
    [handleTrackDownloadClick, topTracks],
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121212] text-white">
        <div className="animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (!hasArtist && statusMessage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#121212] text-white">
        <p className="text-zinc-400">{statusMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#121212] overflow-y-auto h-full text-white">
      {/* Header */}
      <header className="relative w-full h-[40vh] min-h-[340px] max-h-[500px]">
        {/* Background Image */}
        {artist?.image ? (
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${artist.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#121212]" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-800">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121212]" />
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 z-10">
          {/* Verified Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#3d91f4] text-white text-[10px] p-0.5 rounded-full w-5 h-5 flex items-center justify-center">
              <i className="fa-solid fa-check" />
            </span>
            <span className="text-sm font-medium">Artista Verificado</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 drop-shadow-lg">
            {artist?.name || "Artista"}
          </h1>

          {followersText && (
            <p className="text-base font-medium drop-shadow-md">{followersText} seguidores</p>
          )}
        </div>
      </header>

      {/* Action Bar & Content */}
      <div className="px-6 md:px-8 pb-10 bg-gradient-to-b from-[#121212] to-black min-h-[50vh]">
        {/* Action Buttons */}
        <div className="flex items-center gap-6 py-6">
          {/* Spotify Link Button */}
          {artist?.spotifyUrl && (
            <a
              href={artist.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 bg-[#1ed760] rounded-full flex items-center justify-center text-black hover:scale-105 hover:bg-[#1fdf64] transition-all shadow-lg"
              title="Ver en Spotify"
            >
              <i className="fa-brands fa-spotify text-2xl" />
            </a>
          )}
        </div>

        {/* Popular Tracks Section */}
        <div className="mt-4">
          <h2 className="text-2xl font-bold mb-4">Populares</h2>

          <div className="flex flex-col">{topTrackItems}</div>
        </div>
      </div>
    </div>
  );
};
