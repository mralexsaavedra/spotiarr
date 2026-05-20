import type { ArtistRelease } from "@spotiarr/shared";
import type { SettingsService } from "@/application/services/settings.service";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import type { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";

export class GetRecentReleasesUseCase {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
    private readonly releaseFeedService: ReleaseFeedService,
    private readonly settingsService: SettingsService,
  ) {}

  async execute(): Promise<ArtistRelease[]> {
    const lookbackDays = await this.settingsService.getNumber("RELEASES_LOOKBACK_DAYS", 30);
    let releases = await this.feedRepository.getReleases(lookbackDays);

    if (releases.length === 0) {
      console.log("[GetRecentReleasesUseCase] Empty release cache — running Deezer-first fallback");

      const artists = await this.spotifyUserLibraryService.getFollowedArtists();
      const catalogArtists = artists.map((a) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.image,
      }));

      const { releases: fallbackReleases } = await this.releaseFeedService.getActiveArtistReleases(
        catalogArtists,
        { lookbackDays },
      );

      await this.feedRepository.upsertArtists(artists);

      if (fallbackReleases.length > 0) {
        await this.feedRepository.upsertReleases(fallbackReleases);
        console.log(
          `[GetRecentReleasesUseCase] Fallback warmed cache with ${fallbackReleases.length} releases for ${artists.length} artists`,
        );
      } else {
        console.warn(
          "[GetRecentReleasesUseCase] Fallback resolved 0 releases — DB warming skipped",
        );
      }

      releases = fallbackReleases;
    }

    return releases;
  }
}
