import { Request, Response } from "express";
import { SettingsService } from "@/application/services/settings.service";
import { FeedRepository } from "@/infrastructure/database/feed.repository";
import { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";

export class FeedController {
  constructor(
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
    private readonly feedRepository: FeedRepository,
    private readonly settingsService: SettingsService,
    private readonly releaseFeedService: ReleaseFeedService,
  ) {}

  getRecentReleases = async (_req: Request, res: Response) => {
    const lookbackDays = await this.settingsService.getNumber("RELEASES_LOOKBACK_DAYS", 30);
    let releases = await this.feedRepository.getReleases(lookbackDays);

    if (releases.length === 0) {
      console.log("[FeedController] Empty release cache — running Deezer-first fallback");

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

      if (fallbackReleases.length > 0) {
        await this.feedRepository.upsertArtists(artists);
        await this.feedRepository.upsertReleases(fallbackReleases);
        console.log(
          `[FeedController] Fallback warmed cache with ${fallbackReleases.length} releases for ${artists.length} artists`,
        );
      } else {
        await this.feedRepository.upsertArtists(artists);
        console.warn("[FeedController] Fallback resolved 0 releases — DB warming skipped");
      }

      releases = fallbackReleases;
    }

    res.json(releases);
  };

  getArtists = async (_req: Request, res: Response) => {
    let artists = await this.feedRepository.getArtists();

    if (artists.length === 0) {
      artists = await this.spotifyUserLibraryService.getFollowedArtists();
    }

    res.json(artists);
  };
}
