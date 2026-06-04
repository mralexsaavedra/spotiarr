import type { ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import type {
  CatalogSearchPort,
  CatalogSearchResult,
} from "@/application/ports/catalog-search.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { DeezerClient } from "./deezer.client";

/**
 * Implements CatalogSearchPort using Deezer as the primary search provider.
 *
 * Artist ID resolution (Design D1):
 * - For each Deezer artist result, look up FollowedArtistCache by the Deezer numeric ID.
 * - If a cache hit exists, surface the Spotify ID (the stable internal PK).
 * - If no cache entry, surface the Deezer ID so the frontend can still navigate.
 *
 * Track search is deferred to PR-3.1b. This adapter always returns an empty tracks array.
 */
export class DeezerCatalogSearchAdapter implements CatalogSearchPort {
  constructor(
    private readonly deezerClient: DeezerClient,
    private readonly feedRepository: FeedRepositoryPort,
  ) {}

  async searchCatalog(
    query: string,
    types: string[],
    limits: { track?: number; album?: number; artist?: number },
  ): Promise<CatalogSearchResult> {
    const [artists, albums] = await Promise.all([
      types.includes("artist")
        ? this.searchArtists(query, limits.artist ?? 5)
        : Promise.resolve<FollowedArtist[]>([]),
      types.includes("album")
        ? this.searchAlbums(query, limits.album ?? 10)
        : Promise.resolve<ArtistRelease[]>([]),
    ]);

    // Track search deferred to PR-3.1b
    const tracks: NormalizedTrack[] = [];

    return { tracks, albums, artists };
  }

  private async searchArtists(query: string, limit: number): Promise<FollowedArtist[]> {
    try {
      const deezerArtists = await this.deezerClient.searchArtistList(query, limit);

      const resolved = await Promise.all(
        deezerArtists.map(async (deezerArtist): Promise<FollowedArtist> => {
          // Look up the cache by Deezer ID to resolve to the Spotify ID
          const cached = await this.feedRepository.getArtistByAnyId(String(deezerArtist.id));
          if (cached) {
            return cached;
          }
          // Artist not in cache — surface the Deezer ID as the identifier
          return {
            id: String(deezerArtist.id),
            name: deezerArtist.name,
            image: deezerArtist.picture ?? null,
            spotifyUrl: null,
          };
        }),
      );

      return resolved;
    } catch {
      return [];
    }
  }

  private async searchAlbums(query: string, limit: number): Promise<ArtistRelease[]> {
    try {
      const deezerAlbums = await this.deezerClient.searchAlbumList(query, limit);

      return deezerAlbums.map(
        (album): ArtistRelease => ({
          artistId: album.artist ? String(album.artist.id) : "unknown",
          artistName: album.artist?.name ?? "Unknown Artist",
          artistImageUrl: null,
          albumId: String(album.id),
          albumName: album.title,
          albumType: undefined,
          releaseDate: album.release_date,
          coverUrl: album.cover_medium ?? album.cover ?? null,
          spotifyUrl: undefined,
        }),
      );
    } catch {
      return [];
    }
  }
}
