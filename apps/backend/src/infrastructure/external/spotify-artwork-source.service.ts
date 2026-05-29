import type {
  ArtworkBackfillCandidate,
  ArtworkBackfillSpotifySourcePort,
} from "@/application/ports/artwork-backfill-sources.port";
import { AppError } from "@/domain/errors/app-error";
import type { SpotifyAlbumClient } from "./spotify-album.client";
import type { SpotifyArtistClient } from "./spotify-artist.client";
import type { SpotifySearchClient } from "./spotify-search.client";

export class SpotifyArtworkSourceService implements ArtworkBackfillSpotifySourcePort {
  constructor(
    private readonly spotifyArtistClient: SpotifyArtistClient,
    private readonly spotifyAlbumClient: SpotifyAlbumClient,
    private readonly spotifySearchClient: SpotifySearchClient,
  ) {}

  async findArtistImageUrl(candidate: ArtworkBackfillCandidate): Promise<string | null> {
    try {
      if (candidate.artistSpotifyId) {
        const artist = await this.spotifyArtistClient.getArtistRaw(candidate.artistSpotifyId);
        const image = artist?.images?.[0]?.url;
        if (image) return image;
      }

      const search = await this.spotifySearchClient.searchCatalog(
        candidate.artistName,
        ["artist"],
        {
          artist: 1,
        },
      );
      return search.artists[0]?.image ?? null;
    } catch (error) {
      throw this.classifyError(error);
    }
  }

  async findAlbumCoverUrl(candidate: ArtworkBackfillCandidate): Promise<string | null> {
    if (!candidate.albumName) return null;

    try {
      if (candidate.albumSpotifyId) {
        const album = await this.spotifyAlbumClient.getAlbumDetails(candidate.albumSpotifyId);
        const image = album.images?.[0]?.url;
        if (image) return image;
      }

      const search = await this.spotifySearchClient.searchCatalog(
        `${candidate.artistName} ${candidate.albumName}`,
        ["album"],
        {
          album: 1,
        },
      );
      return search.albums[0]?.coverUrl ?? null;
    } catch (error) {
      throw this.classifyError(error);
    }
  }

  private classifyError(error: unknown): AppError {
    if (error instanceof AppError && error.statusCode === 429) {
      return new AppError(429, "spotify_rate_limited", "spotify_rate_limited");
    }

    if (error instanceof Error && "errorCode" in error) {
      const code = (error as { errorCode?: string }).errorCode;
      if (code === "circuit_open") {
        return new AppError(429, "spotify_rate_limited", "spotify_circuit_open");
      }
    }

    return new AppError(502, "internal_server_error", "spotify_artwork_lookup_failed");
  }
}
