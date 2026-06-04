import type { ArtistDetail, ArtistRelease } from "@spotiarr/shared";
import { isDeezerArtistId } from "@spotiarr/shared";
import type { DeezerArtistLookupPort } from "@/application/ports/deezer-artist-lookup.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import { AppError } from "@/domain/errors/app-error";
import {
  INTERACTIVE_CATALOG_TIMEOUT_MS,
  isArtistCacheFresh,
  withTimeout,
} from "./artist-catalog.constants";

export class GetArtistDetailUseCase {
  constructor(
    private readonly feedRepository: FeedRepositoryPort,
    private readonly releaseFeedService: ReleaseFeedPort,
    private readonly deezerArtistClient: DeezerArtistLookupPort,
  ) {}

  async execute(artistId: string, limit: number): Promise<ArtistDetail> {
    const cachedArtist = await this.feedRepository.getArtistByAnyId(artistId);
    const isFollowed = cachedArtist !== null;
    const effectiveLimit = isFollowed ? limit : Math.min(limit, 5);

    // Resolve artist details — prefer DB, fallback to Deezer, fallback to unknown on 429
    let details: {
      name: string;
      image: string | null;
      spotifyUrl: string | null;
      followers: number | null;
      genres: string[];
    };

    if (cachedArtist) {
      details = {
        name: cachedArtist.name,
        image: cachedArtist.image,
        spotifyUrl: cachedArtist.spotifyUrl ?? null,
        followers: null,
        genres: [],
      };
    } else {
      // DB miss path — resolve via Deezer (not Spotify)
      try {
        details = await withTimeout(
          this.resolveDeezerArtistDetails(artistId),
          INTERACTIVE_CATALOG_TIMEOUT_MS,
        );

        // Persist resolved artist to cache if we got a real name
        if (details.name !== "Unknown Artist") {
          await this.feedRepository.upsertArtists([
            {
              id: artistId,
              name: details.name,
              image: details.image,
              spotifyUrl: null,
            },
          ]);
        }
      } catch (err) {
        if (err instanceof AppError && (err.statusCode === 429 || err.statusCode === 504)) {
          // Rate limited or interactive timeout — return partial response
          return {
            id: artistId,
            name: "Unknown Artist",
            image: null,
            spotifyUrl: null,
            followers: null,
            genres: [],
            albums: [],
            isFollowed,
          };
        }
        throw err;
      }
    }

    // Resolve albums with freshness check
    let albums: ArtistRelease[];
    let catalogRefreshPending = false;

    const freshness = await this.feedRepository.getArtistAlbumsFreshness(artistId);

    if (isArtistCacheFresh(freshness)) {
      albums = await this.feedRepository.getArtistAlbums(artistId, effectiveLimit, 0);
    } else {
      // Stale or missing cache — try provider refresh (Deezer → MusicBrainz → Spotify)
      try {
        const { albums: providerAlbums } = await withTimeout(
          this.releaseFeedService.getArtistDiscography({
            id: artistId,
            name: details.name,
            imageUrl: details.image,
          }),
          INTERACTIVE_CATALOG_TIMEOUT_MS,
        );

        if (providerAlbums.length > 0) {
          await this.feedRepository.upsertArtistAlbums(providerAlbums);
        }

        albums = await this.feedRepository.getArtistAlbums(artistId, effectiveLimit, 0);
      } catch (err) {
        if (err instanceof AppError && (err.statusCode === 429 || err.statusCode === 504)) {
          // Rate limited or interactive timeout during refresh — fall back to whatever is in DB
          albums = await this.feedRepository.getArtistAlbums(artistId, effectiveLimit, 0);
          catalogRefreshPending = albums.length === 0;
        } else {
          // Other errors — fall back to DB but don't mark as pending
          albums = await this.feedRepository.getArtistAlbums(artistId, effectiveLimit, 0);
        }
      }
    }

    return {
      id: artistId,
      name: details.name,
      image: details.image,
      spotifyUrl: details.spotifyUrl,
      followers: details.followers,
      genres: details.genres,
      albums,
      isFollowed,
      catalogRefreshPending: catalogRefreshPending || undefined,
    };
  }

  /**
   * Resolve artist details from Deezer.
   * - If the ID looks like a Deezer numeric ID, call getArtistById directly.
   * - Otherwise try getArtistByAnyId via the DB first (may return a cached name to search by),
   *   then fall back to searchArtist if we have a name hint.
   * Returns an Unknown Artist placeholder when Deezer returns nothing.
   */
  private async resolveDeezerArtistDetails(artistId: string): Promise<{
    name: string;
    image: string | null;
    spotifyUrl: string | null;
    followers: number | null;
    genres: string[];
  }> {
    const unknown = {
      name: "Unknown Artist",
      image: null,
      spotifyUrl: null,
      followers: null,
      genres: [] as string[],
    };

    try {
      if (isDeezerArtistId(artistId)) {
        const result = await this.deezerArtistClient.getArtistById(artistId);
        if (!result) return unknown;
        return {
          name: result.name,
          image: result.picture ?? null,
          spotifyUrl: null,
          followers: null,
          genres: [],
        };
      }

      // Spotify-shaped or unknown ID: we don't have a name to search by in the miss path.
      // Try searchArtist with the ID as a last resort (may return nothing useful).
      // In practice, the caller should have a name from the UI context; this path handles
      // edge cases where only the ID is available.
      // For Spotify-shaped or other IDs: try searchArtist using the ID as a hint.
      // This is a best-effort call; PR-3.1a will resolve proper name-based search via
      // the catalog search context when a name is available.
      const result = await this.deezerArtistClient.searchArtist(artistId);
      if (!result) return unknown;
      return {
        name: result.name,
        image: result.picture ?? null,
        spotifyUrl: null,
        followers: null,
        genres: [],
      };
    } catch (err) {
      if (err instanceof AppError && (err.statusCode === 429 || err.statusCode === 504)) {
        throw err;
      }
      return unknown;
    }
  }
}
