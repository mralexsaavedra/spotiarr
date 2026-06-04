import type { ArtistDetail, ArtistRelease } from "@spotiarr/shared";
import { isDeezerArtistId } from "@spotiarr/shared";
import type { DeezerArtistLookupPort } from "@/application/ports/deezer-artist-lookup.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import { AppError } from "@/domain/errors/app-error";
import { upscaleDeezerImage } from "@/domain/helpers/deezer-image.helper";
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

    let details: {
      name: string;
      image: string | null;
      spotifyUrl: string | null;
      followers: number | null;
      genres: string[];
    };

    if (cachedArtist) {
      const freshImage = await this.refreshArtistImage(cachedArtist.id);
      details = {
        name: cachedArtist.name,
        image: freshImage ?? upscaleDeezerImage(cachedArtist.image) ?? cachedArtist.image,
        spotifyUrl: cachedArtist.spotifyUrl ?? null,
        followers: null,
        genres: [],
      };
    } else {
      try {
        details = await withTimeout(
          this.resolveDeezerArtistDetails(artistId),
          INTERACTIVE_CATALOG_TIMEOUT_MS,
        );

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

    let albums: ArtistRelease[];
    let catalogRefreshPending = false;

    const freshness = await this.feedRepository.getArtistAlbumsFreshness(artistId);

    if (isArtistCacheFresh(freshness)) {
      albums = await this.feedRepository.getArtistAlbums(artistId, effectiveLimit, 0);
    } else {
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
        albums = await this.feedRepository.getArtistAlbums(artistId, effectiveLimit, 0);
        if (err instanceof AppError && (err.statusCode === 429 || err.statusCode === 504)) {
          catalogRefreshPending = albums.length === 0;
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

  private async refreshArtistImage(spotifyArtistId: string): Promise<string | null> {
    const [identity] = await this.feedRepository.getArtistCatalogIdentities([spotifyArtistId]);
    if (!identity?.deezerId) return null;
    try {
      const fresh = await this.deezerArtistClient.getArtistById(identity.deezerId);
      return fresh?.picture ?? null;
    } catch {
      return null;
    }
  }

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

      // No name available in miss path; pass ID as a best-effort search term.
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
