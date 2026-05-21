import { Request, Response } from "express";
import { GetRecentReleasesUseCase } from "@/application/use-cases/feed/get-recent-releases.use-case";
import { FeedRepository } from "@/infrastructure/database/feed.repository";
import { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";

export class FeedController {
  constructor(
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
    private readonly feedRepository: FeedRepository,
    private readonly getRecentReleasesUseCase: GetRecentReleasesUseCase,
  ) {}

  getRecentReleases = async (_req: Request, res: Response) => {
    const releases = await this.getRecentReleasesUseCase.execute();
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
