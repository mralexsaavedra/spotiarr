import type { ArtistDetail, ArtistRelease } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import type { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";
import {
  INTERACTIVE_CATALOG_TIMEOUT_MS,
  isArtistCacheFresh,
  withTimeout,
} from "./artist-catalog.constants";

export class GetArtistDetailUseCase {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly releaseFeedService: ReleaseFeedService,
    private readonly spotifyArtistClient: SpotifyArtistClient,
  ) {}

  async execute(spotifyArtistId: string, limit: number): Promise<ArtistDetail> {
    const cachedArtist = await this.feedRepository.getArtistBySpotifyId(spotifyArtistId);
    const isFollowed = cachedArtist !== null;
    const effectiveLimit = isFollowed ? limit : Math.min(limit, 5);

    // Resolve artist details — prefer DB, fallback to Spotify, fallback to unknown on 429
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
        spotifyUrl: cachedArtist.spotifyUrl,
        followers: null,
        genres: [],
      };
    } else {
      try {
        details = await withTimeout(
          this.spotifyArtistClient.getArtistDetails(spotifyArtistId),
          INTERACTIVE_CATALOG_TIMEOUT_MS,
        );
      } catch (err) {
        if (err instanceof AppError && (err.statusCode === 429 || err.statusCode === 504)) {
          // Rate limited or interactive timeout — return partial response with what we have in DB
          return {
            id: spotifyArtistId,
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
    let albumsRateLimited = false;

    const freshness = await this.feedRepository.getArtistAlbumsFreshness(spotifyArtistId);

    if (isArtistCacheFresh(freshness)) {
      albums = await this.feedRepository.getArtistAlbums(spotifyArtistId, effectiveLimit, 0);
    } else {
      // Stale or missing cache — try provider refresh (Deezer → MusicBrainz → Spotify)
      try {
        const { albums: providerAlbums } = await withTimeout(
          this.releaseFeedService.getArtistDiscography({
            id: spotifyArtistId,
            name: details.name,
            imageUrl: details.image,
          }),
          INTERACTIVE_CATALOG_TIMEOUT_MS,
        );

        if (providerAlbums.length > 0) {
          await this.feedRepository.upsertArtistAlbums(providerAlbums);
        }

        albums = await this.feedRepository.getArtistAlbums(spotifyArtistId, effectiveLimit, 0);
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 429) {
          // Rate limited during refresh — fall back to whatever is in DB
          albums = await this.feedRepository.getArtistAlbums(spotifyArtistId, effectiveLimit, 0);
          albumsRateLimited = albums.length === 0;
        } else {
          // Other errors — fall back to DB but don't mark as rate limited
          albums = await this.feedRepository.getArtistAlbums(spotifyArtistId, effectiveLimit, 0);
        }
      }
    }

    return {
      id: spotifyArtistId,
      name: details.name,
      image: details.image,
      spotifyUrl: details.spotifyUrl,
      followers: details.followers,
      genres: details.genres,
      albums,
      isFollowed,
      albumsRateLimited: albumsRateLimited || undefined,
    };
  }
}
