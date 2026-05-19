import type { ArtistRelease } from "@spotiarr/shared";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import {
  INTERACTIVE_CATALOG_TIMEOUT_MS,
  isArtistCacheFresh,
  withTimeout,
} from "./artist-catalog.constants";

export class GetArtistAlbumsUseCase {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly releaseFeedService: ReleaseFeedService,
  ) {}

  async execute(spotifyArtistId: string, limit: number, offset: number): Promise<ArtistRelease[]> {
    const freshness = await this.feedRepository.getArtistAlbumsFreshness(spotifyArtistId);

    if (!isArtistCacheFresh(freshness)) {
      // Stale or missing cache — refresh from providers before paginating
      try {
        const cachedArtist = await this.feedRepository.getArtistBySpotifyId(spotifyArtistId);
        const name = cachedArtist?.name ?? "Unknown Artist";
        const imageUrl = cachedArtist?.image ?? null;

        const { albums: providerAlbums } = await withTimeout(
          this.releaseFeedService.getArtistDiscography({
            id: spotifyArtistId,
            name,
            imageUrl,
          }),
          INTERACTIVE_CATALOG_TIMEOUT_MS,
        );

        if (providerAlbums.length > 0) {
          await this.feedRepository.upsertArtistAlbums(providerAlbums);
        }
      } catch {
        // If provider refresh fails, fall through to DB read (may be empty or stale)
      }
    }

    return this.feedRepository.getArtistAlbums(spotifyArtistId, limit, offset);
  }
}
