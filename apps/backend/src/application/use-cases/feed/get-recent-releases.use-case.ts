import type { ArtistRelease } from "@spotiarr/shared";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { SpotifyUserLibraryPort } from "@/application/ports/spotify-user-library.port";

export class GetRecentReleasesUseCase {
  constructor(
    private readonly feedRepository: FeedRepositoryPort,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryPort,
    private readonly releaseFeedService: ReleaseFeedPort,
    private readonly settingsService: SettingsPort,
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
