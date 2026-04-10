import { Request, Response } from "express";
import { SettingsService } from "@/application/services/settings.service";
import { FeedRepository } from "@/infrastructure/database/feed.repository";
import { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";

export class FeedController {
  constructor(
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
    private readonly feedRepository: FeedRepository,
    private readonly settingsService: SettingsService,
  ) {}

  getRecentReleases = async (_req: Request, res: Response) => {
    const lookbackDays = await this.settingsService.getNumber("RELEASES_LOOKBACK_DAYS", 30);
    let releases = await this.feedRepository.getReleases(lookbackDays);

    if (releases.length === 0) {
      releases = await this.spotifyUserLibraryService.getFollowedArtistsRecentReleases();
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
